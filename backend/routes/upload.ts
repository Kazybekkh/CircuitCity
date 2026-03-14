import { Router, Request, Response } from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  CircuitGraph,
  CircuitComponent,
  CircuitEdge,
  ComponentType,
} from '../../shared/types'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'])
const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
}

// POST /api/upload
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  const { originalname, buffer, mimetype } = req.file
  const ext = originalname.split('.').pop()?.toLowerCase() ?? ''

  try {
    let graph: CircuitGraph

    if (IMAGE_EXTS.has(ext) || mimetype.startsWith('image/')) {
      // ---- Gemini Vision path ----
      graph = await parseImageWithGemini(buffer, MIME_MAP[ext] || mimetype)
    } else {
      // ---- Text-based parsers (CDDX / SPICE) ----
      const text = buffer.toString('utf-8')
      if (ext === 'cddx' || ext === 'xml' || text.trimStart().startsWith('<?xml') || text.includes('<circuit')) {
        graph = parseCddxXml(text)
      } else if (['cir', 'sp', 'spice', 'net', 'spi'].includes(ext)) {
        graph = parseSpiceText(text)
      } else if (/^[*.]|^[RVCDLMQSI]\d/im.test(text.slice(0, 200))) {
        graph = parseSpiceText(text)
      } else {
        res.status(400).json({ error: `Unsupported file format: .${ext}` })
        return
      }
    }

    res.json(graph)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Upload parse error:', msg)
    res.status(422).json({ error: msg })
  }
})

export default router

/* ================================================================== */
/*  Gemini Vision — parse a schematic image into CircuitGraph          */
/* ================================================================== */

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

async function parseImageWithGemini(imageBuffer: Buffer, mimeType: string): Promise<CircuitGraph> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set — cannot parse images.')

  const genAI = new GoogleGenerativeAI(apiKey)

  // Try models in order — fall back if one hits quota or fails
  let lastError: Error | null = null
  for (const modelName of MODELS) {
    try {
      return await callGeminiVision(genAI, modelName, imageBuffer, mimeType)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const msg = lastError.message
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
        console.warn(`Model ${modelName} rate-limited, trying next...`)
        continue
      }
      throw lastError
    }
  }
  if (lastError?.message.includes('429') || lastError?.message.includes('quota')) {
    throw new Error('Gemini API rate limit reached. Wait a minute and try again, or check your API key quota at https://aistudio.google.com/apikey')
  }
  throw lastError ?? new Error('All Gemini models failed')
}

async function callGeminiVision(
  genAI: GoogleGenerativeAI,
  modelName: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<CircuitGraph> {
  const model = genAI.getGenerativeModel({ model: modelName })

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  }

  const prompt = `You are a circuit schematic parser. Analyze this circuit diagram image and extract every electronic component and their connections.

Return ONLY valid JSON with this exact structure (no markdown, no explanation, no code fences):
{
  "components": [
    { "id": "c0", "type": "<type>", "label": "<label>", "value": <number_or_null> }
  ],
  "connections": [
    { "from": "<component_id>", "to": "<component_id>" }
  ]
}

Rules:
- "type" MUST be one of: battery, resistor, led, capacitor, switch, ground, motor, wire
- For batteries/voltage sources: type="battery", value=voltage in volts
- For resistors: type="resistor", value=resistance in ohms (e.g. 220, 1000, 4700)
- For capacitors: type="capacitor", value=capacitance in microfarads
- For LEDs/diodes: type="led", value=null
- For switches: type="switch", value=1 (closed) or 0 (open)
- For motors: type="motor", value=null
- For ground/earth symbols: type="ground", value=null
- "label" should be the component reference designator if visible (R1, C1, V1, D1, etc.), otherwise generate one
- "connections" lists which components are directly connected by wires
- If you see a wire junction connecting multiple components, list each pair
- Include a ground component if you see a ground symbol
- Extract ALL components and ALL connections you can identify
- If you cannot identify the circuit clearly, return your best guess with whatever you can detect`

  const result = await model.generateContent([prompt, imagePart])
  const response = result.response
  const text = response.text()

  // Strip markdown code fences if Gemini wraps them
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  let parsed: { components: { id: string; type: string; label: string; value: number | null }[]; connections: { from: string; to: string }[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Gemini returned unparseable response. Raw output: ${text.slice(0, 300)}`)
  }

  if (!parsed.components || !Array.isArray(parsed.components)) {
    throw new Error('Gemini response missing "components" array.')
  }

  // Convert to CircuitGraph
  const VALID_TYPES = new Set<ComponentType>(['battery', 'wire', 'resistor', 'led', 'capacitor', 'switch', 'ground', 'motor'])

  const components: CircuitComponent[] = parsed.components.map((c, i) => {
    const type: ComponentType = VALID_TYPES.has(c.type as ComponentType) ? (c.type as ComponentType) : 'resistor'
    return {
      id: c.id || `c${i}`,
      type,
      label: c.label || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      value: c.value ?? undefined,
      position: { x: 50 + i * 200, y: 150 },
    }
  })

  const edges: CircuitEdge[] = []
  const edgeSet = new Set<string>()
  const compIds = new Set(components.map(c => c.id))

  if (parsed.connections && Array.isArray(parsed.connections)) {
    for (const conn of parsed.connections) {
      if (!compIds.has(conn.from) || !compIds.has(conn.to)) continue
      if (conn.from === conn.to) continue
      const key = [conn.from, conn.to].sort().join('\x00')
      if (edgeSet.has(key)) continue
      edgeSet.add(key)
      edges.push({ id: `e${edges.length}`, sourceId: conn.from, targetId: conn.to })
    }
  }

  // Auto-layout via BFS
  layoutGraph(components, edges)

  return { components, edges }
}

function layoutGraph(components: CircuitComponent[], edges: CircuitEdge[]) {
  if (components.length === 0) return
  const adj = new Map<string, string[]>()
  for (const c of components) adj.set(c.id, [])
  for (const e of edges) {
    adj.get(e.sourceId)?.push(e.targetId)
    adj.get(e.targetId)?.push(e.sourceId)
  }
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
  for (const c of components) if (!visited.has(c.id)) order.push(c.id)
  const compMap = new Map(components.map(c => [c.id, c]))
  for (let i = 0; i < order.length; i++) {
    const c = compMap.get(order[i])
    if (c) c.position = { x: 50 + i * 200, y: 150 }
  }
}

/* ================================================================== */
/*  CDDX XML parser                                                    */
/* ================================================================== */

function parseCddxXml(xml: string): CircuitGraph {
  const components: CircuitComponent[] = []
  const edges: CircuitEdge[] = []
  const edgeSet = new Set<string>()
  const defs = new Map<string, string>()
  const defRe = /<add\s[^>]*id="(\d+)"[^>]*item="([^"]+)"/gi
  let m: RegExpExecArray | null
  while ((m = defRe.exec(xml)) !== null) defs.set(m[1], m[2].toLowerCase())
  const compRe = /<c\s([^>]*)>([\s\S]*?)<\/c>/gi
  const cnBuckets = new Map<string, string[]>()
  while ((m = compRe.exec(xml)) !== null) {
    const attrs = m[1], body = m[2]
    const id = attr(attrs, 'id') ?? `c${Math.random().toString(36).slice(2, 7)}`
    const tp = attr(attrs, 'tp') ?? ''
    const x = parseInt(attr(attrs, 'x') ?? '0', 10)
    const y = parseInt(attr(attrs, 'y') ?? '0', 10)
    const refMatch = tp.match(/\{(\d+)\}/)
    const typeName = refMatch ? defs.get(refMatch[1]) ?? tp : tp.toLowerCase()
    const type = mapType(typeName)
    let value: number | undefined, label: string | undefined
    const pRe = /<p\s[^>]*k="([^"]+)"[^>]*v="([^"]*)"/gi
    let pm: RegExpExecArray | null
    while ((pm = pRe.exec(body)) !== null) {
      if (pm[1] === 'resistance') value = parseFloat(pm[2])
      if (pm[1] === 'capacitance') value = parseFloat(pm[2]) * 1e6
      if (pm[1] === 'voltage') value = parseFloat(pm[2])
      if (pm[1] === 'text' && pm[2].trim()) label = pm[2].trim()
    }
    if (!label) {
      label = type.charAt(0).toUpperCase() + type.slice(1)
      if (value !== undefined) {
        const u = type === 'battery' ? 'V' : type === 'resistor' ? '\u03A9' : type === 'capacitor' ? '\u00B5F' : ''
        label += ` ${value}${u}`
      }
    }
    const cid = `cddx_${id}`
    components.push({ id: cid, type, label, value, position: { x, y } })
    const cnRe = /<cn\s[^>]*id="(\d+)"/gi
    let cm: RegExpExecArray | null
    while ((cm = cnRe.exec(body)) !== null) {
      if (!cnBuckets.has(cm[1])) cnBuckets.set(cm[1], [])
      cnBuckets.get(cm[1])!.push(cid)
    }
  }
  for (const [, ids] of cnBuckets) {
    for (let i = 0; i < ids.length - 1; i++) {
      const key = [ids[i], ids[i + 1]].sort().join('\x00')
      if (edgeSet.has(key)) continue; edgeSet.add(key)
      edges.push({ id: `e${edges.length}`, sourceId: ids[i], targetId: ids[i + 1] })
    }
  }
  return { components, edges }
}

function attr(s: string, name: string): string | undefined {
  const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(s)
  return m ? m[1] : undefined
}

/* ================================================================== */
/*  SPICE parser                                                       */
/* ================================================================== */

function parseSpiceText(text: string): CircuitGraph {
  const rawLines = text.split(/\r?\n/)
  const lines: string[] = []
  for (const r of rawLines) {
    if (r.startsWith('+') && lines.length) lines[lines.length - 1] += ' ' + r.slice(1).trim()
    else lines.push(r)
  }
  const components: CircuitComponent[] = []
  const nodeToComps = new Map<string, string[]>()
  const gndNodes = new Set(['0', 'gnd', 'GND'])
  let needsGround = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || i === 0 || line.startsWith('*') || line.startsWith(';') || line.startsWith('.')) continue
    const tokens = line.split(/[\s,]+/).filter(Boolean)
    if (tokens.length < 3) continue
    const prefix = tokens[0][0].toUpperCase()
    const parsed = parseLine(prefix, tokens)
    if (!parsed) continue
    const cid = `sp_${tokens[0]}`
    components.push({ id: cid, type: parsed.type, label: tokens[0], value: parsed.value, position: { x: 0, y: 0 } })
    for (const nd of parsed.nodes) {
      if (gndNodes.has(nd)) { needsGround = true; continue }
      if (!nodeToComps.has(nd)) nodeToComps.set(nd, [])
      nodeToComps.get(nd)!.push(cid)
    }
    if (parsed.nodes.some(n => gndNodes.has(n))) {
      if (!nodeToComps.has('__gnd__')) nodeToComps.set('__gnd__', [])
      nodeToComps.get('__gnd__')!.push(cid)
    }
  }
  if (needsGround) {
    components.push({ id: 'sp_GND', type: 'ground', label: 'GND', position: { x: 0, y: 0 } })
    if (!nodeToComps.has('__gnd__')) nodeToComps.set('__gnd__', [])
    nodeToComps.get('__gnd__')!.push('sp_GND')
  }
  const edges: CircuitEdge[] = []
  const es = new Set<string>()
  const addE = (a: string, b: string) => { const k = [a, b].sort().join('\x00'); if (es.has(k)) return; es.add(k); edges.push({ id: `e${edges.length}`, sourceId: a, targetId: b }) }
  for (const [nid, ids] of nodeToComps) {
    if (ids.length < 2) continue
    if (nid === '__gnd__') { for (const c of ids) { if (c !== 'sp_GND') addE(c, 'sp_GND') } }
    else { for (let i = 0; i < ids.length - 1; i++) addE(ids[i], ids[i + 1]) }
  }
  layoutGraph(components, edges)
  return { components, edges }
}

interface PL { type: ComponentType; nodes: string[]; value?: number }
function parseLine(prefix: string, tokens: string[]): PL | null {
  const SCALE: Record<string, number> = { f: 1e-15, p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, meg: 1e6, g: 1e9, t: 1e12 }
  const pv = (s: string) => { const mt = s.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-z]*)/i); if (!mt) return NaN; const n = parseFloat(mt[1]); const sf = mt[2].toLowerCase(); return n * (SCALE[sf] ?? (sf.startsWith('meg') ? 1e6 : 1)) }
  const two = (t: ComponentType): PL => ({ type: t, nodes: [tokens[1], tokens[2]], value: tokens[3] ? pv(tokens[3]) : undefined })
  switch (prefix) {
    case 'R': return two('resistor')
    case 'C': return two('capacitor')
    case 'L': return two('motor')
    case 'D': return two('led')
    case 'S': return two('switch')
    case 'I': return two('battery')
    case 'V': {
      const nodes = [tokens[1], tokens[2]]
      let value: number | undefined
      for (let i = 3; i < tokens.length; i++) { if (/^(DC|AC)$/i.test(tokens[i])) continue; const v = pv(tokens[i]); if (!isNaN(v) && v !== 0) { value = Math.abs(v); break } }
      return { type: 'battery', nodes, value: value ?? 9 }
    }
    case 'M': return { type: 'motor', nodes: tokens.slice(1, 5).filter(Boolean) }
    case 'Q': return { type: 'motor', nodes: tokens.slice(1, 4).filter(Boolean) }
    default: return null
  }
}

const TYPE_KW: [RegExp, ComponentType][] = [
  [/resistor/i, 'resistor'], [/capacitor/i, 'capacitor'], [/(?:led|diode)/i, 'led'],
  [/(?:battery|cell|voltage)/i, 'battery'], [/switch/i, 'switch'], [/motor/i, 'motor'],
  [/(?:ground|earth)/i, 'ground'], [/inductor/i, 'motor'],
]
function mapType(name: string): ComponentType {
  for (const [re, ct] of TYPE_KW) if (re.test(name)) return ct
  return 'resistor'
}
