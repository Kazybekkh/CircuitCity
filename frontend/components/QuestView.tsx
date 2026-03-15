'use client'

import { useEffect, useRef } from 'react'
import { useCircuitStore } from '../store/circuitStore'
import type { CircuitGraph, SimulationState, FaultType } from '../../shared/types'

// ─── Constants ────────────────────────────────────────────────────────────────
const WORLD_W = 3200
const WORLD_H = 1600

// ─── Types ────────────────────────────────────────────────────────────────────
type BiomeType = 'forest' | 'dungeon' | 'desert' | 'arctic' | 'lava' | 'void'

interface LandmarkData {
  id: string
  type: string
  label: string
  value?: number
  x: number
  y: number
  powered: boolean
  currentFlow: number
  fault: FaultType | null
  isClosed?: boolean
}

interface SceneData {
  biome: BiomeType
  landmarks: LandmarkData[]
  heroSpeed: number
  isEmpty: boolean
}

interface PathPt {
  x: number
  y: number
  landmarkId?: string
  isCapacitor?: boolean
  resistanceScale?: number
}

interface Particle {
  t: number
  speed: number
  color: number
}

interface PixiState {
  app: any
  world: any
  heroContainer: any
  dayNightOverlay: any
  pathContainer: any
  landmarksContainer: any
  tilesContainer: any
  particlesContainer: any
  uiContainer: any
  currentScene: SceneData | null
  heroPath: PathPt[]
  heroPathIdx: number
  heroProgress: number
  heroPauseMs: number
  elapsed: number
  animTick: number
  particles: Particle[]
}

// ─── Biome palettes ───────────────────────────────────────────────────────────
const BIOME: Record<BiomeType, {
  bg: number; tile1: number; tile2: number; pathColor: number
}> = {
  forest:  { bg: 0x123d18, tile1: 0x1a4d22, tile2: 0x0e3010, pathColor: 0x6b4c30 },
  dungeon: { bg: 0x0c0b20, tile1: 0x16143a, tile2: 0x0a0918, pathColor: 0x2a2255 },
  desert:  { bg: 0x3a2410, tile1: 0x4a3018, tile2: 0x2e1c0c, pathColor: 0x8c7040 },
  arctic:  { bg: 0x0e1e30, tile1: 0x182a42, tile2: 0x0a1624, pathColor: 0x6090a8 },
  lava:    { bg: 0x1a0404, tile1: 0x280a0a, tile2: 0x0e0202, pathColor: 0xcc3300 },
  void:    { bg: 0x040408, tile1: 0x0a0c1c, tile2: 0x020204, pathColor: 0x2a1255 },
}

// ─── Component → RPG colours ──────────────────────────────────────────────────
const LANDMARK_COL: Record<string, { primary: number; secondary: number; glow: number }> = {
  battery:   { primary: 0xffd700, secondary: 0xb8860b, glow: 0xffaa00 },
  resistor:  { primary: 0x4a3020, secondary: 0x6a4030, glow: 0x8b5a30 },
  capacitor: { primary: 0x2a2280, secondary: 0x1a1850, glow: 0x4040cc },
  led:       { primary: 0xff6600, secondary: 0xcc3300, glow: 0xffcc44 },
  switch:    { primary: 0x808080, secondary: 0x505050, glow: 0xaaaacc },
  ground:    { primary: 0x6b21a8, secondary: 0x3b1178, glow: 0xaa55ff },
  motor:     { primary: 0xcc2200, secondary: 0x881500, glow: 0xff4400 },
  wire:      { primary: 0x888888, secondary: 0x555555, glow: 0xaaaaaa },
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ─── Scene derivation ─────────────────────────────────────────────────────────
function deriveScene(graph: CircuitGraph, sim: SimulationState | null): SceneData {
  const comps = graph.components
  if (comps.length === 0) {
    return { biome: 'forest', landmarks: [], heroSpeed: 60, isEmpty: true }
  }

  const faultTypes = sim?.faults.map(f => f.fault) ?? []
  let biome: BiomeType = 'forest'
  if (faultTypes.includes('short_circuit')) biome = 'lava'
  else if (faultTypes.includes('open_circuit')) biome = 'void'
  else if (comps.some(c => c.type === 'capacitor')) biome = 'dungeon'
  else if (comps.some(c => c.type === 'resistor' && (c.value ?? 0) > 1000)) biome = 'desert'
  else {
    const avg = (sim?.componentStates ?? [])
      .reduce((s, cs) => s + cs.currentFlow, 0) / Math.max(1, sim?.componentStates.length ?? 1)
    if (avg < 0.15) biome = 'arctic'
  }

  const count = comps.length
  const X_START = 350, X_END = WORLD_W - 350, Y_MID = WORLD_H / 2

  const landmarks: LandmarkData[] = comps.map((comp, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const x = X_START + t * (X_END - X_START)
    const y = Y_MID + Math.sin(t * Math.PI * 3) * 200 + Math.cos(t * Math.PI * 1.5) * 100
    const cs = sim?.componentStates.find(s => s.componentId === comp.id)
    const fault = sim?.faults.find(f => f.componentId === comp.id)?.fault ?? null
    return {
      id: comp.id, type: comp.type, label: comp.label ?? comp.type,
      value: comp.value, x, y,
      powered: cs?.powered ?? false,
      currentFlow: cs?.currentFlow ?? 0,
      fault,
      isClosed: comp.type === 'switch' ? (cs?.powered ?? false) : undefined,
    }
  })

  const maxFlow = Math.max(0.05, ...landmarks.map(l => l.currentFlow))
  const heroSpeed = 60 + maxFlow * 160
  return { biome, landmarks, heroSpeed, isEmpty: false }
}

// ─── Path ─────────────────────────────────────────────────────────────────────
function buildHeroPath(landmarks: LandmarkData[]): PathPt[] {
  if (landmarks.length === 0) return [{ x: WORLD_W / 2, y: WORLD_H / 2 }]
  const pts: PathPt[] = landmarks.map(lm => ({
    x: lm.x, y: lm.y, landmarkId: lm.id,
    isCapacitor: lm.type === 'capacitor',
    resistanceScale: lm.type === 'resistor'
      ? Math.max(0.2, 1 / (1 + (lm.value ?? 100) / 500))
      : 1,
  }))
  pts.push({ x: pts[0].x, y: pts[0].y })
  return pts
}

// ─── Tilemap ──────────────────────────────────────────────────────────────────
function drawTiles(PIXI: any, container: any, biome: BiomeType): void {
  container.removeChildren()
  const pal = BIOME[biome]
  const g = new PIXI.Graphics()
  g.rect(0, 0, WORLD_W, WORLD_H).fill(pal.bg)

  const TILE = 32
  for (let tx = 0; tx < WORLD_W / TILE; tx++) {
    for (let ty = 0; ty < WORLD_H / TILE; ty++) {
      const h = (tx * 1619 + ty * 2971) % 17
      if (h < 3) g.rect(tx * TILE, ty * TILE, TILE, TILE).fill(pal.tile1)
      else if (h < 5) g.rect(tx * TILE, ty * TILE, TILE, TILE).fill(pal.tile2)
    }
  }

  const rng = seededRng(biome.charCodeAt(0) * 997)
  if (biome === 'forest') {
    for (let i = 0; i < 120; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H, sz = 12 + rng() * 20
      g.rect(x - sz / 4, y, sz / 2, sz * 0.7).fill(0x2d1a00)
      g.rect(x - sz / 2, y - sz * 0.8, sz, sz * 0.8).fill(0x0d5c1a)
      g.rect(x - sz * 0.3, y - sz * 1.3, sz * 0.6, sz * 0.5).fill(0x147a24)
    }
  } else if (biome === 'dungeon') {
    for (let i = 0; i < 40; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H
      const w = 12 + rng() * 16, h2 = 40 + rng() * 60
      g.rect(x, y, w, h2).fill(0x1e1c38)
      g.rect(x + 2, y + 2, w - 4, 6).fill(0x2e2a50)
    }
    for (let i = 0; i < 20; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H
      g.rect(x, y, 8, 16).fill(0x3a3060)
      g.rect(x - 2, y - 8, 12, 8).fill(0xff8800)
    }
  } else if (biome === 'desert') {
    for (let i = 0; i < 60; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H
      g.ellipse(x, y, 80 + rng() * 100, 18 + rng() * 30).fill({ color: 0x7a5c30, alpha: 0.4 })
    }
    for (let i = 0; i < 30; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H
      g.rect(x, y - 30, 8, 30).fill(0x2a5c1a)
      g.rect(x - 16, y - 18, 16, 6).fill(0x2a5c1a)
      g.rect(x + 8, y - 14, 16, 6).fill(0x2a5c1a)
    }
  } else if (biome === 'arctic') {
    for (let i = 0; i < 80; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H, h2 = 15 + rng() * 30
      g.poly([x, y - h2, x + h2 / 3, y, x, y + 4, x - h2 / 3, y])
        .fill({ color: 0x88ccee, alpha: 0.3 })
    }
    for (let i = 0; i < 40; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H
      g.ellipse(x, y, 40 + rng() * 60, 10 + rng() * 15).fill({ color: 0xddeeff, alpha: 0.25 })
    }
  } else if (biome === 'lava') {
    for (let i = 0; i < 60; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H
      g.ellipse(x, y, 20 + rng() * 50, 8 + rng() * 20).fill({ color: 0xdd2200, alpha: 0.4 })
    }
    for (let i = 0; i < 50; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H, s = 10 + rng() * 20
      g.rect(x, y, s, s * 0.7).fill(0x1a0818)
    }
  } else if (biome === 'void') {
    for (let i = 0; i < 70; i++) {
      const x = rng() * WORLD_W, y = rng() * WORLD_H, s = 4 + rng() * 12
      g.rect(x, y, s, s).fill({ color: 0x3a1a5a, alpha: 0.6 })
    }
    for (let i = 0; i < 30; i++) {
      const x1 = rng() * WORLD_W, y1 = rng() * WORLD_H
      const len = 30 + rng() * 80, angle = rng() * Math.PI * 2
      g.moveTo(x1, y1)
        .lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len)
        .stroke({ color: 0x2a0a4a, width: 2 })
    }
  }

  container.addChild(g)
}

// ─── Path line ────────────────────────────────────────────────────────────────
function drawPathLine(PIXI: any, container: any, pts: PathPt[], biome: BiomeType): void {
  container.removeChildren()
  if (pts.length < 2) return
  const pal = BIOME[biome]
  const g = new PIXI.Graphics()

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: pal.pathColor, width: 30, alpha: 0.7 })
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.floor(dist / 22)
    for (let s = 0; s < steps; s += 2) {
      const t0 = s / steps, t1 = (s + 1) / steps
      g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0)
        .lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1)
        .stroke({ color: 0xffd700, width: 2, alpha: 0.5 })
    }
  }
  container.addChild(g)
}

// ─── Value formatter ──────────────────────────────────────────────────────────
function fmtValue(type: string, value: number): string {
  if (type === 'resistor') return value >= 1000 ? `${(value / 1000).toFixed(1)}kΩ` : `${value}Ω`
  if (type === 'capacitor') return value < 0.001 ? `${(value * 1e6).toFixed(0)}μF` : `${value}F`
  if (type === 'battery') return `${value}V`
  return `${value}`
}

// ─── Landmark graphics ────────────────────────────────────────────────────────
function drawLandmark(PIXI: any, lm: LandmarkData): any {
  const c = new PIXI.Container()
  c.x = lm.x
  c.y = lm.y
  c.label = lm.id
  const g = new PIXI.Graphics()
  const col = LANDMARK_COL[lm.type] ?? LANDMARK_COL.wire
  const lit = lm.powered

  switch (lm.type) {
    case 'battery': {
      g.rect(-32, 12, 64, 18).fill(col.secondary)
      g.rect(-28, 6, 56, 8).fill(col.primary)
      g.rect(-24, -10, 48, 18).fill(col.primary)
      g.rect(-30, -44, 8, 38).fill(col.secondary)
      g.rect(22, -44, 8, 38).fill(col.secondary)
      g.rect(-30, -48, 60, 8).fill(col.primary)
      if (lit) {
        for (let s = -20; s <= 20; s += 12) {
          g.rect(s - 2, -64, 4, 20).fill(col.glow)
        }
        g.circle(0, -52, 16).fill({ color: col.glow, alpha: 0.15 })
      }
      break
    }
    case 'resistor': {
      const sw = lm.fault ? 0x444444 : col.primary
      g.ellipse(0, 10, 46, 22).fill({ color: sw, alpha: 0.9 })
      g.ellipse(-15, 0, 26, 14).fill({ color: col.secondary, alpha: 0.85 })
      g.ellipse(15, 2, 22, 13).fill({ color: col.secondary, alpha: 0.85 })
      g.ellipse(-8, -8, 12, 8).fill({ color: 0x1a0a00, alpha: 0.6 })
      g.ellipse(10, -6, 10, 7).fill({ color: 0x1a0a00, alpha: 0.6 })
      if (lit) {
        g.circle(-15, -5, 6).fill(0xff2222)
        g.circle(15, -5, 6).fill(0xff2222)
      } else {
        g.circle(-15, -5, 5).fill(0x440000)
        g.circle(15, -5, 5).fill(0x440000)
      }
      break
    }
    case 'capacitor': {
      g.rect(-34, -50, 68, 75).fill(col.secondary)
      g.rect(-30, -46, 60, 67).fill(0x080818)
      for (let bx = -24; bx <= 24; bx += 12) {
        g.rect(bx - 3, -44, 6, 62).fill(col.primary)
      }
      if (lit) g.rect(-28, -42, 56, 58).fill({ color: col.glow, alpha: 0.18 })
      g.rect(-8, 8, 16, 12).fill(0x888888)
      g.circle(0, 14, 4).fill(0x444444)
      break
    }
    case 'led': {
      g.poly([-32, 16, -22, 22, 22, 22, 32, 16, 22, 4, -22, 4]).fill(0x5a5050)
      g.rect(-20, 4, 8, 18).fill(0x4a2800)
      g.rect(10, 4, 8, 18).fill(0x4a2800)
      g.rect(-6, 8, 12, 14).fill(0x3a2000)
      if (lit) {
        g.poly([0, -32, -9, -12, 0, -6, 9, -12]).fill(0xff8800)
        g.poly([0, -26, -5, -10, 0, -4, 5, -10]).fill(0xffee00)
        g.poly([-12, -20, -18, -4, -9, 0, -4, -10]).fill(0xff4400)
        g.poly([12, -20, 18, -4, 9, 0, 4, -10]).fill(0xff4400)
        g.circle(0, -20, 22).fill({ color: 0xff8800, alpha: 0.12 })
      } else {
        g.poly([0, -10, -4, -2, 0, 0, 4, -2]).fill(0x442200)
      }
      break
    }
    case 'switch': {
      g.rect(-42, -45, 20, 65).fill(0x606060)
      g.rect(-46, -50, 28, 10).fill(0x808080)
      g.rect(22, -45, 20, 65).fill(0x606060)
      g.rect(18, -50, 28, 10).fill(0x808080)
      if (lm.isClosed) {
        g.rect(-22, -8, 44, 18).fill(col.primary)
        g.moveTo(-22, -8).lineTo(22, -8).stroke({ color: 0x999999, width: 2 })
      } else {
        g.rect(-22, -28, 20, 16).fill(col.secondary)
        g.rect(2, -28, 20, 16).fill(col.secondary)
        g.moveTo(-12, -28).lineTo(-22, -45).stroke({ color: 0x707070, width: 3 })
        g.moveTo(12, -28).lineTo(22, -45).stroke({ color: 0x707070, width: 3 })
      }
      break
    }
    case 'ground': {
      g.circle(0, 0, 36).fill({ color: col.secondary, alpha: 0.8 })
      g.circle(0, 0, 28).fill({ color: col.primary, alpha: 0.9 })
      g.circle(0, 0, 18).fill({ color: 0x000000, alpha: 0.7 })
      g.circle(0, 0, 10).fill({ color: col.glow, alpha: lit ? 0.95 : 0.3 })
      g.circle(0, 0, 4).fill(lit ? 0xffffff : 0x330033)
      if (lit) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          g.moveTo(Math.cos(a) * 20, Math.sin(a) * 20)
            .lineTo(Math.cos(a) * 40, Math.sin(a) * 40)
            .stroke({ color: col.glow, width: 2 })
        }
      }
      break
    }
    case 'motor': {
      const fc = lit ? col.primary : col.secondary
      g.rect(-30, -38, 60, 58).fill(fc)
      g.rect(-22, -30, 16, 16).fill(lit ? 0xffdd88 : 0x222222)
      g.rect(6, -30, 16, 16).fill(lit ? 0xffdd88 : 0x222222)
      g.rect(-22, -10, 16, 14).fill(lit ? 0xffcc44 : 0x222222)
      g.rect(6, -10, 16, 14).fill(lit ? 0xffcc44 : 0x222222)
      g.rect(-12, -58, 10, 22).fill(0x444444)
      g.rect(4, -52, 10, 16).fill(0x444444)
      if (lit) {
        g.ellipse(-7, -58, 8, 6).fill({ color: 0x888888, alpha: 0.5 })
        g.ellipse(9, -52, 6, 5).fill({ color: 0x888888, alpha: 0.5 })
      }
      break
    }
    default: {
      g.circle(0, 0, 22).fill(col.primary)
      g.circle(0, 0, 14).fill(col.secondary)
      break
    }
  }

  if (lm.fault === 'short_circuit') {
    g.rect(-44, -64, 88, 98).stroke({ color: 0xff0000, width: 4 })
  } else if (lm.fault === 'open_circuit') {
    g.moveTo(-18, -52).lineTo(4, 0).lineTo(-4, 0).lineTo(18, 52).stroke({ color: 0x888888, width: 3 })
  }

  c.addChild(g)

  const labelText = new PIXI.Text({
    text: lm.label.slice(0, 12).toUpperCase(),
    style: { fontFamily: 'monospace', fontSize: 10, fill: 0xbbbbbb, align: 'center' },
  })
  labelText.anchor.set(0.5, 0)
  labelText.y = 36
  c.addChild(labelText)

  if (lm.value !== undefined && lm.value !== null) {
    const valText = new PIXI.Text({
      text: fmtValue(lm.type, lm.value),
      style: { fontFamily: 'monospace', fontSize: 9, fill: 0x777777, align: 'center' },
    })
    valText.anchor.set(0.5, 0)
    valText.y = 49
    c.addChild(valText)
  }

  return c
}

function drawLandmarksLayer(PIXI: any, container: any, landmarks: LandmarkData[]): void {
  container.removeChildren()
  for (const lm of landmarks) container.addChild(drawLandmark(PIXI, lm))
}

// ─── Hero sprite ──────────────────────────────────────────────────────────────
function buildHeroGfx(PIXI: any): any {
  const g = new PIXI.Graphics()
  // Boots
  g.rect(-8, 12, 7, 5).fill(0x3a1e00)
  g.rect(1, 12, 7, 5).fill(0x3a1e00)
  // Legs
  g.rect(-8, 0, 7, 13).fill(0x3b1d6e)
  g.rect(1, 0, 7, 13).fill(0x3b1d6e)
  // Belt
  g.rect(-5, -1, 10, 4).fill(0xf59e0b)
  // Body
  g.rect(-9, -16, 18, 17).fill(0x6b21a8)
  // Shoulders
  g.rect(-13, -16, 5, 7).fill(0x7a2bbf)
  g.rect(8, -16, 5, 7).fill(0x7a2bbf)
  // Arms
  g.rect(-12, -10, 4, 9).fill(0x6b21a8)
  g.rect(8, -10, 4, 9).fill(0x6b21a8)
  // Hands
  g.rect(-12, -2, 4, 5).fill(0xf4b87a)
  g.rect(8, -2, 4, 5).fill(0xf4b87a)
  // Neck
  g.rect(-3, -18, 6, 3).fill(0xf4b87a)
  // Head
  g.rect(-7, -30, 14, 13).fill(0xf4b87a)
  // Hair
  g.rect(-7, -30, 14, 4).fill(0xc8860a)
  g.rect(-9, -28, 3, 8).fill(0xc8860a)
  g.rect(6, -28, 3, 8).fill(0xc8860a)
  // Eyes
  g.rect(-5, -23, 3, 3).fill(0x1a1a88)
  g.rect(2, -23, 3, 3).fill(0x1a1a88)
  // Mouth
  g.rect(-3, -18, 6, 2).fill(0xcc7755)
  // Sword
  g.rect(12, -24, 3, 26).fill(0xdddddd)
  g.rect(8, -26, 10, 4).fill(0xaa8800)
  g.rect(13, -28, 2, 5).fill(0xdddddd)
  return g
}

// ─── Landmark animation ───────────────────────────────────────────────────────
function animateLandmarks(container: any, tick: number, scene: SceneData): void {
  for (const child of container.children) {
    const lm = scene.landmarks.find(l => l.id === child.label)
    if (!lm) continue
    if (lm.type === 'led' && lm.powered) {
      child.alpha = 0.8 + 0.2 * Math.sin(tick * 0.12)
    } else if (lm.fault === 'short_circuit') {
      child.alpha = 0.5 + 0.5 * Math.sin(tick * 0.35)
    } else if (lm.type === 'ground' && lm.powered) {
      child.rotation = (tick * 0.008) % (Math.PI * 2)
    } else {
      child.alpha = 1
    }
  }
}

// ─── Particle flow ────────────────────────────────────────────────────────────
function updateParticles(PIXI: any, container: any, state: PixiState): void {
  container.removeChildren()
  const scene = state.currentScene
  const path = state.heroPath
  if (!scene || scene.isEmpty || path.length < 2) return

  const maxFlow = Math.max(0, ...scene.landmarks.map(l => l.currentFlow))
  if (maxFlow < 0.05) { state.particles = []; return }

  const wantedCount = Math.floor(maxFlow * 18) + 4
  const pathSegments = path.length - 1

  while (state.particles.length < wantedCount) {
    state.particles.push({
      t: Math.random(),
      speed: 0.0003 + Math.random() * 0.0004,
      color: scene.biome === 'lava' ? 0xff4400 : scene.biome === 'void' ? 0x8844ff : 0xffd700,
    })
  }
  while (state.particles.length > 25) state.particles.pop()

  const g = new PIXI.Graphics()
  for (const p of state.particles) {
    p.t = (p.t + p.speed * (scene.heroSpeed / 60)) % 1
    const segT = p.t * pathSegments
    const segIdx = Math.min(pathSegments - 1, Math.floor(segT))
    const segFrac = segT - segIdx
    const a = path[segIdx], b = path[Math.min(path.length - 1, segIdx + 1)]
    const px = a.x + (b.x - a.x) * segFrac
    const py = a.y + (b.y - a.y) * segFrac
    g.circle(px, py, 4).fill({ color: p.color, alpha: 0.85 })
  }
  container.addChild(g)
}

// ─── Day/night ────────────────────────────────────────────────────────────────
function updateDayNight(PIXI: any, overlay: any, elapsed: number, app: any): void {
  const W = app.screen.width, H = app.screen.height
  const t = (elapsed % 60_000) / 60_000
  let color: number, alpha: number
  if (t < 0.25) { color = 0xff8800; alpha = 0.07 * (1 - t / 0.25) }
  else if (t < 0.5) { color = 0xffffff; alpha = 0 }
  else if (t < 0.75) { color = 0xff4400; alpha = ((t - 0.5) / 0.25) * 0.1 }
  else { color = 0x000044; alpha = 0.12 + ((t - 0.75) / 0.25) * 0.1 }

  overlay.clear()
  if (alpha > 0.001) overlay.rect(0, 0, W, H).fill({ color, alpha })
}

// ─── Hero movement ────────────────────────────────────────────────────────────
function updateHero(state: PixiState, deltaMS: number): void {
  const scene = state.currentScene
  if (!scene || scene.isEmpty || state.heroPath.length < 2) return
  if (state.heroPauseMs > 0) { state.heroPauseMs -= deltaMS; return }

  const pathLen = state.heroPath.length - 1
  const segIdx = state.heroPathIdx % pathLen
  const a = state.heroPath[segIdx]
  const b = state.heroPath[(segIdx + 1) % state.heroPath.length]
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  if (dist < 1) {
    state.heroPathIdx = (state.heroPathIdx + 1) % pathLen
    state.heroProgress = 0
    return
  }

  const resistScale = a.resistanceScale ?? 1
  const step = (scene.heroSpeed * resistScale * deltaMS) / 1000 / dist
  state.heroProgress += step

  if (state.heroProgress >= 1) {
    state.heroProgress = 0
    const nextIdx = (state.heroPathIdx + 1) % pathLen
    state.heroPathIdx = nextIdx
    const nextPt = state.heroPath[nextIdx]
    if (nextPt.isCapacitor) {
      const lm = scene.landmarks.find(l => l.id === nextPt.landmarkId)
      state.heroPauseMs = Math.min(3000, (lm?.value ?? 100) * 1.0)
    }
    return
  }

  state.heroContainer.x = a.x + (b.x - a.x) * state.heroProgress
  state.heroContainer.y = a.y + (b.y - a.y) * state.heroProgress
  const dx = b.x - a.x
  if (Math.abs(dx) > 1) state.heroContainer.scale.x = dx > 0 ? 1 : -1
}

// ─── Wipe transition ──────────────────────────────────────────────────────────
function wipeTransition(PIXI: any, app: any, onMidpoint: () => void): void {
  const W = app.screen.width, H = app.screen.height
  const cover = new PIXI.Graphics()
  app.stage.addChild(cover)
  const HALF = 200
  let elapsed = 0, fired = false

  const tick = (ticker: any) => {
    elapsed += ticker.deltaMS
    cover.clear()
    if (elapsed <= HALF) {
      cover.rect(0, 0, W, (elapsed / HALF) * H).fill(0x000000)
    } else {
      if (!fired) { fired = true; onMidpoint() }
      const h = H * (1 - Math.min(1, (elapsed - HALF) / HALF))
      if (h > 0) cover.rect(0, 0, W, h).fill(0x000000)
    }
    if (elapsed >= HALF * 2) { app.ticker.remove(tick); cover.destroy() }
  }
  app.ticker.add(tick)
}

// ─── Empty screen ─────────────────────────────────────────────────────────────
function buildEmptyScreen(PIXI: any, container: any): void {
  container.removeChildren()
  const g = new PIXI.Graphics()
  const rng = seededRng(1337)
  for (let i = 0; i < 250; i++) {
    const x = rng() * WORLD_W, y = rng() * WORLD_H
    const s = rng() > 0.9 ? 2 : 1
    g.rect(x, y, s, s).fill({ color: 0xffffff, alpha: 0.3 + rng() * 0.7 })
  }
  container.addChild(g)

  const msg = new PIXI.Text({
    text: 'DRAW A CIRCUIT\nOR UPLOAD A SCHEMATIC\nTO BEGIN YOUR QUEST',
    style: { fontFamily: 'monospace', fontSize: 18, fill: 0x8866aa, align: 'center', lineHeight: 32 },
  })
  msg.anchor.set(0.5)
  msg.x = WORLD_W / 2
  msg.y = WORLD_H / 2
  container.addChild(msg)

  const cursor = new PIXI.Graphics()
  cursor.rect(0, 0, 12, 22).fill(0x8866aa)
  cursor.x = WORLD_W / 2 + 92
  cursor.y = WORLD_H / 2 + 16
  container.addChild(cursor)
}

// ─── Build full scene ─────────────────────────────────────────────────────────
function buildScene(PIXI: any, state: PixiState, scene: SceneData, app: any): void {
  state.currentScene = scene
  state.particles = []

  drawTiles(PIXI, state.tilesContainer, scene.biome)
  const path = buildHeroPath(scene.landmarks)
  state.heroPath = path
  drawPathLine(PIXI, state.pathContainer, path, scene.biome)

  if (scene.isEmpty) {
    buildEmptyScreen(PIXI, state.landmarksContainer)
    state.heroContainer.visible = false
    // Center world on screen
    state.world.x = app.screen.width / 2 - WORLD_W / 2
    state.world.y = app.screen.height / 2 - WORLD_H / 2
  } else {
    state.heroContainer.visible = true
    drawLandmarksLayer(PIXI, state.landmarksContainer, scene.landmarks)
    const start = path[0]
    state.heroContainer.x = start.x
    state.heroContainer.y = start.y
    state.heroPathIdx = 0
    state.heroProgress = 0
    state.heroPauseMs = 0
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuestView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pixiStateRef = useRef<PixiState | null>(null)
  const circuitGraphRef = useRef<CircuitGraph>({ components: [], edges: [] })
  const simulationStateRef = useRef<SimulationState | null>(null)

  const circuitGraph = useCircuitStore(s => s.circuitGraph)
  const simulationState = useCircuitStore(s => s.simulationState)

  // Keep refs current
  circuitGraphRef.current = circuitGraph
  simulationStateRef.current = simulationState

  // ── Init PixiJS once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    const init = async () => {
      const PIXI = await import('pixi.js')
      if (cancelled || !containerRef.current) return

      const app = new PIXI.Application()
      await app.init({
        resizeTo: containerRef.current,
        background: 0x0f0e17,
        antialias: false,
        resolution: 1,
      })
      if (cancelled) { app.destroy(true); return }

      const canvas = app.canvas as HTMLCanvasElement
      canvas.style.imageRendering = 'pixelated'
      containerRef.current.appendChild(canvas)

      const world = new PIXI.Container()
      const tilesContainer = new PIXI.Container()
      const pathContainer = new PIXI.Container()
      const landmarksContainer = new PIXI.Container()
      const particlesContainer = new PIXI.Container()
      const heroContainer = new PIXI.Container()
      const uiContainer = new PIXI.Container()

      world.addChild(tilesContainer, pathContainer, landmarksContainer, particlesContainer, heroContainer)
      app.stage.addChild(world)

      const dayNightOverlay = new PIXI.Graphics()
      app.stage.addChild(dayNightOverlay)
      app.stage.addChild(uiContainer)

      const heroGfx = buildHeroGfx(PIXI)
      heroContainer.addChild(heroGfx)

      const state: PixiState = {
        app, world, heroContainer, dayNightOverlay,
        pathContainer, landmarksContainer, tilesContainer, particlesContainer,
        uiContainer, currentScene: null,
        heroPath: [], heroPathIdx: 0, heroProgress: 0,
        heroPauseMs: 0, elapsed: 0, animTick: 0, particles: [],
      }
      pixiStateRef.current = state

      // Build scene with latest values
      buildScene(PIXI, state, deriveScene(circuitGraphRef.current, simulationStateRef.current), app)

      // Game loop
      app.ticker.add((ticker: any) => {
        const s = pixiStateRef.current
        if (!s || !s.currentScene) return
        s.elapsed += ticker.deltaMS
        s.animTick += ticker.deltaTime

        updateHero(s, ticker.deltaMS)

        if (!s.currentScene.isEmpty) {
          // Smooth camera follow
          const tx = app.screen.width / 2 - s.heroContainer.x
          const ty = app.screen.height / 2 - s.heroContainer.y
          s.world.x += (tx - s.world.x) * 0.05 * ticker.deltaTime
          s.world.y += (ty - s.world.y) * 0.05 * ticker.deltaTime
        }

        updateDayNight(PIXI, s.dayNightOverlay, s.elapsed, app)
        animateLandmarks(s.landmarksContainer, s.animTick, s.currentScene)
        updateParticles(PIXI, s.particlesContainer, s)
      })
    }

    init()
    return () => {
      cancelled = true
      if (pixiStateRef.current) {
        try { pixiStateRef.current.app.destroy(true, { children: true }) } catch (_) {}
        pixiStateRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild on simulation change ────────────────────────────────────────────
  useEffect(() => {
    const s = pixiStateRef.current
    if (!s) return
    import('pixi.js').then(PIXI => {
      const s2 = pixiStateRef.current
      if (!s2) return
      const scene = deriveScene(circuitGraphRef.current, simulationStateRef.current)
      wipeTransition(PIXI, s2.app, () => {
        const s3 = pixiStateRef.current
        if (s3) buildScene(PIXI, s3, scene, s3.app)
      })
    })
  }, [simulationState]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0F0E17' }}
    />
  )
}
