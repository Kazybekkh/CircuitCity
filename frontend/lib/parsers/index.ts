import { CircuitGraph } from '../../../shared/types'
import { parseCddx } from './cddxParser'
import { parseSpice } from './spiceParser'

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

  return res.json()
}

async function readHead(file: File, bytes: number): Promise<string> {
  const slice = file.slice(0, bytes)
  return slice.text()
}
