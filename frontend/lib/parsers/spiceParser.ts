import { CircuitGraph, CircuitComponent, CircuitEdge, ComponentType } from '../../../shared/types'

/**
 * Parse a SPICE netlist (.cir / .sp / .spice / .net) into a CircuitGraph.
 *
 * Format summary (SPICE 3):
 *   First line  = title (comment)
 *   Last line   = .END
 *   Component   = NAME NODE+ VALUE
 *   First letter of NAME determines type:
 *     R = resistor, C = capacitor, L = inductor,
 *     V = voltage source (battery), I = current source,
 *     D = diode (LED), M = MOSFET, Q = BJT
 *   Node "0" is always ground.
 */
export async function parseSpice(file: File): Promise<CircuitGraph> {
  const text = await file.text()
  return parseSpiceText(text)
}

export function parseSpiceText(text: string): CircuitGraph {
  const rawLines = text.split(/\r?\n/)

  // Handle continuation lines (lines starting with '+')
  const lines: string[] = []
  for (const raw of rawLines) {
    if (raw.startsWith('+') && lines.length > 0) {
      lines[lines.length - 1] += ' ' + raw.slice(1).trim()
    } else {
      lines.push(raw)
    }
  }

  const components: CircuitComponent[] = []
  const nodeToComps = new Map<string, string[]>() // spice node → [compId, …]
  const groundNodes = new Set<string>(['0', 'gnd', 'GND'])
  let needsGround = false
  let compIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (i === 0) continue // title line
    if (line.startsWith('*') || line.startsWith(';')) continue // comments
    if (line.startsWith('.')) continue // directives

    const tokens = line.split(/[\s,]+/).filter(Boolean)
    if (tokens.length < 3) continue

    const name = tokens[0]
    const prefix = name[0].toUpperCase()
    const parsed = parseComponentLine(prefix, tokens)
    if (!parsed) continue

    const { type, nodes, value } = parsed
    const compId = `sp_${name}`

    const unitLabel = formatValue(type, value)
    const label = `${name}${unitLabel ? ' ' + unitLabel : ''}`

    components.push({
      id: compId,
      type,
      label,
      value,
      position: { x: 0, y: 0 }, // will be laid out below
    })

    // Register node connections
    for (const node of nodes) {
      if (groundNodes.has(node)) { needsGround = true; continue }
      if (!nodeToComps.has(node)) nodeToComps.set(node, [])
      nodeToComps.get(node)!.push(compId)
    }

    // Track ground connections per component
    if (nodes.some(n => groundNodes.has(n))) {
      const gndNode = '__ground__'
      if (!nodeToComps.has(gndNode)) nodeToComps.set(gndNode, [])
      nodeToComps.get(gndNode)!.push(compId)
    }

    compIndex++
  }

  // Add a ground component if any node references ground
  if (needsGround) {
    const gndId = 'sp_GND'
    components.push({
      id: gndId,
      type: 'ground',
      label: 'GND',
      position: { x: 0, y: 0 },
    })
    if (!nodeToComps.has('__ground__')) nodeToComps.set('__ground__', [])
    nodeToComps.get('__ground__')!.push(gndId)
  }

  // Build edges from shared nodes
  const edges: CircuitEdge[] = []
  const edgeSet = new Set<string>()

  const addEdge = (a: string, b: string) => {
    const key = [a, b].sort().join('\x00')
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    edges.push({ id: `e${edges.length}`, sourceId: a, targetId: b })
  }

  nodeToComps.forEach((compIds, nodeId) => {
    if (compIds.length < 2) return
    if (nodeId === '__ground__') {
      // Each non-ground component connects directly to GND
      for (const cid of compIds) {
        if (cid !== 'sp_GND') addEdge(cid, 'sp_GND')
      }
    } else {
      // Chain components sharing a non-ground node
      for (let i = 0; i < compIds.length - 1; i++) addEdge(compIds[i], compIds[i + 1])
    }
  })

  // Auto-layout: BFS from battery then left-to-right
  layoutComponents(components, edges)

  return { components, edges }
}

// ---------------------------------------------------------------------------
// Component line parser
// ---------------------------------------------------------------------------

interface ParsedComponent {
  type: ComponentType
  nodes: string[]
  value?: number
}

function parseComponentLine(prefix: string, tokens: string[]): ParsedComponent | null {
  switch (prefix) {
    case 'R': return parseTwoTerminal('resistor', tokens)
    case 'C': return parseTwoTerminal('capacitor', tokens)
    case 'L': return parseTwoTerminal('motor', tokens) // inductor → motor for demo
    case 'V': return parseVoltageSource(tokens)
    case 'I': return parseTwoTerminal('battery', tokens) // current source → battery
    case 'D': return parseTwoTerminal('led', tokens)     // diode → LED
    case 'M': return parseFourTerminal('motor', tokens)  // MOSFET → motor
    case 'Q': return parseThreeTerminal('motor', tokens)  // BJT → motor
    case 'S': return parseTwoTerminal('switch', tokens)
    default: return null
  }
}

function parseTwoTerminal(type: ComponentType, tokens: string[]): ParsedComponent {
  const nodes = [tokens[1], tokens[2]]
  const value = tokens[3] ? parseSpiceValue(tokens[3]) : undefined
  return { type, nodes, value }
}

function parseVoltageSource(tokens: string[]): ParsedComponent {
  const nodes = [tokens[1], tokens[2]]
  // V1 n+ n- [DC] value
  let value: number | undefined
  for (let i = 3; i < tokens.length; i++) {
    if (tokens[i].toUpperCase() === 'DC' || tokens[i].toUpperCase() === 'AC') continue
    const v = parseSpiceValue(tokens[i])
    if (!isNaN(v) && v !== 0) { value = Math.abs(v); break }
  }
  return { type: 'battery', nodes, value: value ?? 9 }
}

function parseThreeTerminal(type: ComponentType, tokens: string[]): ParsedComponent {
  return { type, nodes: [tokens[1], tokens[2], tokens[3]].filter(Boolean) }
}

function parseFourTerminal(type: ComponentType, tokens: string[]): ParsedComponent {
  return { type, nodes: [tokens[1], tokens[2], tokens[3], tokens[4]].filter(Boolean) }
}

// ---------------------------------------------------------------------------
// Value parsing with SPICE scale factors
// ---------------------------------------------------------------------------

const SCALE: Record<string, number> = {
  f: 1e-15, p: 1e-12, n: 1e-9, u: 1e-6,
  m: 1e-3, k: 1e3, meg: 1e6, g: 1e9, t: 1e12,
}

function parseSpiceValue(raw: string): number {
  const match = raw.match(/^([+-]?[0-9]*\.?[0-9]+(?:e[+-]?\d+)?)\s*([a-zA-Z]*)/i)
  if (!match) return NaN
  const num = parseFloat(match[1])
  const suffix = match[2].toLowerCase()
  const mult = SCALE[suffix] ?? (suffix.startsWith('meg') ? 1e6 : 1)
  return num * mult
}

function formatValue(type: ComponentType, value?: number): string {
  if (value === undefined) return ''
  if (type === 'battery') return `${value}V`
  if (type === 'resistor') {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M\u03A9`
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k\u03A9`
    return `${value}\u03A9`
  }
  if (type === 'capacitor') {
    const uf = value * 1e6
    if (uf >= 1) return `${uf.toFixed(0)}\u00B5F`
    return `${(value * 1e9).toFixed(0)}nF`
  }
  return `${value}`
}

// ---------------------------------------------------------------------------
// Auto-layout
// ---------------------------------------------------------------------------

function layoutComponents(components: CircuitComponent[], edges: CircuitEdge[]) {
  if (components.length === 0) return

  const adj = new Map<string, string[]>()
  for (const c of components) adj.set(c.id, [])
  for (const e of edges) {
    adj.get(e.sourceId)?.push(e.targetId)
    adj.get(e.targetId)?.push(e.sourceId)
  }

  // BFS from first battery (or first component) for ordering
  const start = components.find(c => c.type === 'battery')?.id ?? components[0].id
  const visited = new Set<string>()
  const order: string[] = []
  const queue = [start]
  visited.add(start)

  while (queue.length > 0) {
    const cur = queue.shift()!
    order.push(cur)
    for (const nb of adj.get(cur) ?? []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
    }
  }

  // Add any remaining disconnected components
  for (const c of components) {
    if (!visited.has(c.id)) order.push(c.id)
  }

  const spacing = 200
  const compMap = new Map(components.map(c => [c.id, c]))
  for (let i = 0; i < order.length; i++) {
    const comp = compMap.get(order[i])
    if (comp) {
      comp.position = { x: 50 + i * spacing, y: 150 }
    }
  }
}
