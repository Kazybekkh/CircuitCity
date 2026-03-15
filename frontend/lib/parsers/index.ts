import { CircuitGraph, CircuitComponent, CircuitEdge as FrontendEdge } from '../../../shared/types'
import { parseCddx } from './cddxParser'
import { parseSpice } from './spiceParser'

// Backend upload returns { circuitGraph: { nodes, edges }, format, confidence }
type BackendNode = { id: string; type: string; value?: number | null; position?: { x: number; y: number } }
type BackendEdge = { id?: string; from: string; to: string }
type BackendGraph = { nodes?: BackendNode[]; edges?: BackendEdge[]; components?: unknown[] }

const BACKEND_TYPE_TO_FRONTEND: Record<string, CircuitComponent['type']> = {
  voltageSource: 'battery',
  currentSource: 'battery',
  inductor: 'motor',
  diode: 'led',
  resistor: 'resistor',
  capacitor: 'capacitor',
  led: 'led',
  switch: 'switch',
  ground: 'ground',
  wire: 'wire',
  motor: 'motor',
  battery: 'battery',
}

export type SupportedFormat = 'cddx' | 'spice' | 'image' | 'unknown'

export const ACCEPTED_EXTENSIONS = '.cddx,.xml,.cir,.sp,.spice,.net,.spi,.png,.jpg,.jpeg,.gif,.webp,.bmp'

export const FORMAT_DESCRIPTIONS: { format: SupportedFormat; extensions: string; label: string }[] = [
  { format: 'image', extensions: '.png, .jpg, .jpeg, .webp', label: 'Schematic Image (Gemini Vision)' },
  { format: 'cddx', extensions: '.cddx, .xml', label: 'Circuit Diagram (CDDX)' },
  { format: 'spice', extensions: '.cir, .sp, .spice, .net', label: 'SPICE Netlist' },
]

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'])

export function detectFormat(filename: string): SupportedFormat {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (ext === 'cddx') return 'cddx'
  if (ext === 'xml') return 'cddx'
  if (['cir', 'sp', 'spice', 'net', 'spi'].includes(ext)) return 'spice'
  return 'unknown'
}

export async function parseCircuitFile(file: File): Promise<CircuitGraph> {
  const format = detectFormat(file.name)

  // Images must be sent to the backend for Gemini Vision processing
  if (format === 'image') return parseImageViaBackend(file)

  if (format === 'cddx') return parseCddx(file)
  if (format === 'spice') return parseSpice(file)

  // Content sniffing
  const head = await readHead(file, 200)
  if (head.includes('<?xml') || head.includes('<circuit')) return parseCddx(file)
  if (/^[*.]|^[RVCDLMQSI]\d/im.test(head)) return parseSpice(file)

  // Last resort — try sending to backend (might be a binary image without proper extension)
  if (file.type.startsWith('image/')) return parseImageViaBackend(file)

  throw new Error(`Unrecognised file format: ${file.name}. Supported: images (.png, .jpg), CDDX (.cddx), SPICE (.cir, .sp)`)
}

function backendGraphToFrontend(raw: BackendGraph): CircuitGraph {
  const nodes = raw.nodes ?? []
  const rawEdges = raw.edges ?? []
  const components: CircuitComponent[] = nodes.map((n, i) => ({
    id: n.id ?? `n${i}`,
    type: BACKEND_TYPE_TO_FRONTEND[n.type] ?? 'resistor',
    value: n.value ?? undefined,
    position: n.position ?? { x: 50 + i * 150, y: 150 },
  }))
  const edges: FrontendEdge[] = rawEdges.map((e, i) => ({
    id: e.id ?? `e${i}`,
    sourceId: e.from,
    targetId: e.to,
  }))
  return { components, edges }
}

async function parseImageViaBackend(file: File): Promise<CircuitGraph> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Server error ${res.status} while parsing image`)
  }

  const data = await res.json()
  const raw: BackendGraph = data.circuitGraph ?? data
  if (!raw || (raw.nodes == null && raw.components == null)) {
    throw new Error('Server returned no circuit data.')
  }
  // Backend may return nodes/edges (upload API) or already components/edges
  if (raw.nodes && Array.isArray(raw.nodes)) {
    return backendGraphToFrontend(raw)
  }
  if (raw.components && Array.isArray((raw as { components: unknown[] }).components)) {
    return raw as unknown as CircuitGraph
  }
  throw new Error('Server returned invalid circuit format.')
}

async function readHead(file: File, bytes: number): Promise<string> {
  const slice = file.slice(0, bytes)
  return slice.text()
}
