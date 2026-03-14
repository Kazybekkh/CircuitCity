import { Router, Request, Response } from 'express'
import {
  CircuitGraph,
  CircuitComponent,
  SimulationState,
  ComponentState,
  FaultType,
} from '../../shared/types'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const graph: CircuitGraph = req.body
  res.json(simulate(graph))
})

export default router

/* ------------------------------------------------------------------ */
/*  Simulation engine (server-side mirror of frontend logic)           */
/* ------------------------------------------------------------------ */

function simulate(graph: CircuitGraph): SimulationState {
  const { components, edges } = graph

  if (components.length === 0) {
    return { isValid: true, componentStates: [], faults: [], commentary: 'Empty circuit.' }
  }

  const batteries = components.filter(c => c.type === 'battery')
  const grounds = components.filter(c => c.type === 'ground')
  const leds = components.filter(c => c.type === 'led')
  const resistors = components.filter(c => c.type === 'resistor')
  const switches = components.filter(c => c.type === 'switch')
  const faults: { componentId: string; fault: FaultType; message: string }[] = []

  if (batteries.length === 0) {
    return {
      isValid: false,
      componentStates: components.map(c => ({
        componentId: c.id, powered: false, currentFlow: 0, fault: 'open_circuit' as FaultType,
      })),
      faults: [{ componentId: 'circuit', fault: 'open_circuit', message: 'No power source.' }],
      commentary: 'No battery in circuit.',
    }
  }

  if (grounds.length === 0) {
    return {
      isValid: false,
      componentStates: components.map(c => ({
        componentId: c.id, powered: false, currentFlow: 0, fault: 'floating_ground' as FaultType,
      })),
      faults: [{ componentId: 'circuit', fault: 'floating_ground', message: 'No ground.' }],
      commentary: 'No ground reference.',
    }
  }

  const openSwitchIds = new Set(switches.filter(s => s.value === 0).map(s => s.id))
  const activeEdges = edges.filter(e => !openSwitchIds.has(e.sourceId) && !openSwitchIds.has(e.targetId))

  const adj = new Map<string, Set<string>>()
  for (const comp of components) adj.set(comp.id, new Set())
  for (const edge of activeEdges) {
    adj.get(edge.sourceId)?.add(edge.targetId)
    adj.get(edge.targetId)?.add(edge.sourceId)
  }

  const visited = new Set<string>()
  const groups: Set<string>[] = []
  for (const comp of components) {
    if (visited.has(comp.id)) continue
    const group = new Set<string>()
    const queue = [comp.id]
    visited.add(comp.id)
    while (queue.length > 0) {
      const cur = queue.shift()!
      group.add(cur)
      for (const nb of adj.get(cur) || []) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
      }
    }
    groups.push(group)
  }

  const compMap = new Map(components.map(c => [c.id, c]))
  const groundIds = new Set(grounds.map(g => g.id))
  const poweredIds = new Set<string>()
  const completeGroups: Set<string>[] = []

  for (const group of groups) {
    const hasBat = batteries.some(b => group.has(b.id))
    const hasGnd = grounds.some(g => group.has(g.id))
    if (hasBat && hasGnd) {
      for (const id of group) poweredIds.add(id)
      completeGroups.push(group)
    }
  }

  for (const group of completeGroups) {
    for (const bat of batteries.filter(b => group.has(b.id))) {
      if (hasDirectPath(bat.id, adj, compMap, groundIds)) {
        faults.push({ componentId: bat.id, fault: 'short_circuit', message: `Short circuit on ${bat.label || 'Battery'}.` })
      }
    }
  }

  for (const led of leds) {
    if (!poweredIds.has(led.id)) continue
    const g = completeGroups.find(gr => gr.has(led.id))
    if (g && !resistors.some(r => g.has(r.id))) {
      faults.push({ componentId: led.id, fault: 'missing_resistor', message: `${led.label || 'LED'} needs a resistor.` })
    }
  }

  for (const comp of components) {
    if (poweredIds.has(comp.id) || comp.type === 'wire' || openSwitchIds.has(comp.id)) continue
    faults.push({ componentId: comp.id, fault: 'open_circuit', message: `${comp.label || comp.type} is not on a complete path.` })
  }

  for (const sw of switches.filter(s => s.value === 0)) {
    faults.push({ componentId: sw.id, fault: 'open_circuit', message: `${sw.label || 'Switch'} is open.` })
  }

  const hasShort = faults.some(f => f.fault === 'short_circuit')
  const flowMap: Record<string, number> = {
    battery: 0.8, resistor: 0.5, led: 0.6, capacitor: 0.4, motor: 0.7, ground: 0.8, switch: 0.7, wire: 0.8,
  }

  const componentStates: ComponentState[] = components.map(comp => {
    const powered = poweredIds.has(comp.id)
    const cf = faults.filter(f => f.componentId === comp.id)
    let currentFlow = 0
    if (powered) {
      if (cf.some(f => f.fault === 'short_circuit')) currentFlow = 1.0
      else if (cf.some(f => f.fault === 'missing_resistor')) currentFlow = 0.9
      else if (hasShort && comp.type !== 'battery' && comp.type !== 'ground') currentFlow = 0.1
      else currentFlow = flowMap[comp.type] ?? 0.6
    }
    return { componentId: comp.id, powered, currentFlow, fault: cf.length ? cf[0].fault : undefined }
  })

  const commentary = faults.length === 0
    ? `Valid circuit — ${componentStates.filter(s => s.powered).length} components powered.`
    : `${faults.length} fault(s): ${faults.map(f => f.message).join(' ')}`

  return { isValid: faults.length === 0, componentStates, faults, commentary }
}

function hasDirectPath(
  batteryId: string,
  adj: Map<string, Set<string>>,
  compMap: Map<string, CircuitComponent>,
  groundIds: Set<string>,
): boolean {
  const visited = new Set<string>([batteryId])
  const queue = [batteryId]
  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const nb of adj.get(cur) || []) {
      if (visited.has(nb)) continue
      visited.add(nb)
      if (groundIds.has(nb)) return true
      const comp = compMap.get(nb)
      if (comp && (comp.type === 'wire' || (comp.type === 'switch' && comp.value !== 0))) {
        queue.push(nb)
      }
    }
  }
  return false
}
