import JSZip from 'jszip'
import { CircuitGraph, CircuitComponent, CircuitEdge, ComponentType } from '../../../shared/types'

/**
 * Parse a CDDX file (Circuit Diagram Document — OPC/ZIP container)
 * into a CircuitGraph. Falls back to raw XML if the file is not a ZIP.
 */
export async function parseCddx(file: File): Promise<CircuitGraph> {
  let xmlContent: string

  try {
    const zip = await JSZip.loadAsync(file)
    const docFile =
      zip.file('circuitdiagram/Document.xml') ??
      zip.file(/Document\.xml$/i)[0] ??
      zip.file(/\.xml$/i)[0]
    if (!docFile) throw new Error('No Document.xml found inside CDDX archive')
    xmlContent = await docFile.async('string')
  } catch {
    // Not a valid ZIP — try treating the raw content as XML
    xmlContent = await file.text()
  }

  return parseCddxXml(xmlContent)
}

/**
 * Parse raw Circuit Diagram XML into a CircuitGraph.
 */
export function parseCddxXml(xml: string): CircuitGraph {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error(`Invalid CDDX XML: ${parseError.textContent?.slice(0, 120)}`)

  // --- Build definitions map: numeric ID → component type name ---
  const defs = new Map<string, string>()
  for (const add of Array.from(doc.getElementsByTagName('add'))) {
    const id = add.getAttribute('id')
    const item = add.getAttribute('item')
    if (id && item) defs.set(id, item.toLowerCase())
  }

  const components: CircuitComponent[] = []
  const connectionBuckets = new Map<string, string[]>() // cn-id → [compId, …]
  const pinPositions = new Map<string, { x: number; y: number }[]>() // compId → [pin1, pin2]

  // --- Parse <c> elements ---
  for (const c of Array.from(doc.getElementsByTagName('c'))) {
    const rawId = c.getAttribute('id') ?? `c${Math.random().toString(36).slice(2, 7)}`
    const compId = `cddx_${rawId}`
    const tp = c.getAttribute('tp') ?? ''
    const x = parseInt(c.getAttribute('x') ?? '0', 10)
    const y = parseInt(c.getAttribute('y') ?? '0', 10)
    const o = c.getAttribute('o') ?? 'h'
    const sz = parseInt(c.getAttribute('sz') ?? '60', 10)

    // Resolve type from {id} reference
    const refMatch = tp.match(/\{(\d+)\}/)
    const typeName = refMatch ? defs.get(refMatch[1]) ?? tp : tp.toLowerCase()
    const componentType = mapToComponentType(typeName)

    let value: number | undefined
    let label: string | undefined

    for (const p of Array.from(c.getElementsByTagName('p'))) {
      const k = p.getAttribute('k')
      const v = p.getAttribute('v')
      if (!k || !v) continue
      if (k === 'resistance') { value = parseFloat(v) }
      if (k === 'capacitance') { value = parseFloat(v) * 1e6 } // F → µF
      if (k === 'voltage' || k === 'electromotive_force') { value = parseFloat(v) }
      if (k === 'text' && v.trim()) { label = v.trim() }
    }

    if (!label) {
      label = componentType.charAt(0).toUpperCase() + componentType.slice(1)
      if (value !== undefined) {
        const unit = componentType === 'battery' ? 'V' : componentType === 'resistor' ? '\u03A9' : componentType === 'capacitor' ? '\u00B5F' : ''
        label += ` ${value}${unit}`
      }
    }

    components.push({ id: compId, type: componentType, label, value, position: { x, y } })

    // Connection points (explicit connectivity)
    for (const cn of Array.from(c.getElementsByTagName('cn'))) {
      const cnId = cn.getAttribute('id')
      if (cnId) {
        if (!connectionBuckets.has(cnId)) connectionBuckets.set(cnId, [])
        connectionBuckets.get(cnId)!.push(compId)
      }
    }

    // Pin positions for geometry fallback
    const pin1 = { x, y }
    const pin2 = o === 'v' ? { x, y: y + sz } : { x: x + sz, y }
    pinPositions.set(compId, [pin1, pin2])
  }

  // --- Build edges ---
  const edges: CircuitEdge[] = []
  const edgeSet = new Set<string>()

  const addEdge = (a: string, b: string) => {
    const key = [a, b].sort().join('\x00')
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    edges.push({ id: `e${edges.length}`, sourceId: a, targetId: b })
  }

  // Primary: explicit <cns> connections
  let hasExplicitConnections = false
  connectionBuckets.forEach((ids) => {
    if (ids.length >= 2) hasExplicitConnections = true
    for (let i = 0; i < ids.length - 1; i++) addEdge(ids[i], ids[i + 1])
  })

  // Fallback: geometry-based connection from wire endpoints
  if (!hasExplicitConnections) {
    // Collect all pin coords for components
    const coordToComps = new Map<string, string[]>()
    pinPositions.forEach((pins, cid) => {
      for (const p of pins) {
        const k = `${p.x},${p.y}`
        if (!coordToComps.has(k)) coordToComps.set(k, [])
        coordToComps.get(k)!.push(cid)
      }
    })

    // Wire endpoints
    const wireEndpoints: { x: number; y: number }[][] = []
    for (const w of Array.from(doc.getElementsByTagName('w'))) {
      const wx = parseInt(w.getAttribute('x') ?? '0', 10)
      const wy = parseInt(w.getAttribute('y') ?? '0', 10)
      const wo = w.getAttribute('o') ?? 'h'
      const wsz = parseInt(w.getAttribute('sz') ?? '60', 10)
      const p1 = { x: wx, y: wy }
      const p2 = wo === 'v' ? { x: wx, y: wy + wsz } : { x: wx + wsz, y: wy }
      wireEndpoints.push([p1, p2])

      for (const p of [p1, p2]) {
        const k = `${p.x},${p.y}`
        if (!coordToComps.has(k)) coordToComps.set(k, [])
      }
    }

    // Union-Find for geometry-based connectivity
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x)
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
      return parent.get(x)!
    }
    const union = (a: string, b: string) => {
      const ra = find(a), rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }

    // Union all elements sharing coordinates
    coordToComps.forEach((ids) => {
      for (let i = 1; i < ids.length; i++) union(ids[0], ids[i])
    })

    // Union wire endpoints (wire endpoint coords that match component pins)
    for (const [p1, p2] of wireEndpoints) {
      const k1 = `${p1.x},${p1.y}`, k2 = `${p2.x},${p2.y}`
      const comps1 = coordToComps.get(k1) ?? []
      const comps2 = coordToComps.get(k2) ?? []
      for (const c1 of comps1) {
        for (const c2 of comps2) union(c1, c2)
      }
    }

    // Group components by root
    const groups = new Map<string, string[]>()
    for (const comp of components) {
      const root = find(comp.id)
      if (!groups.has(root)) groups.set(root, [])
      groups.get(root)!.push(comp.id)
    }

    // Chain components in each group
    groups.forEach((ids) => {
      for (let i = 0; i < ids.length - 1; i++) addEdge(ids[i], ids[i + 1])
    })
  }

  return { components, edges }
}

// ---------------------------------------------------------------------------

const TYPE_KEYWORDS: [RegExp, ComponentType][] = [
  [/resistor/i, 'resistor'],
  [/capacitor/i, 'capacitor'],
  [/(?:led|diode|light)/i, 'led'],
  [/(?:battery|cell|voltage.source|power.supply|dc.source)/i, 'battery'],
  [/switch/i, 'switch'],
  [/motor/i, 'motor'],
  [/(?:ground|earth|gnd)/i, 'ground'],
  [/inductor/i, 'motor'],
  [/wire/i, 'wire'],
]

function mapToComponentType(name: string): ComponentType {
  for (const [re, ct] of TYPE_KEYWORDS) {
    if (re.test(name)) return ct
  }
  return 'resistor' // safe default for unknown components
}
