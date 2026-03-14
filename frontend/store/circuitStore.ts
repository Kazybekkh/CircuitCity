import { create } from 'zustand'
import { CircuitGraph, SimulationState } from '../../shared/types'
import { simulate } from '../lib/simulationEngine'

type ActiveMode = 'build' | 'upload' | 'learn' | 'debug' | 'challenge'

interface CircuitStore {
  activeMode: ActiveMode
  circuitGraph: CircuitGraph
  simulationState: SimulationState | null
  selectedComponentId: string | null
  isNarrating: boolean
  pendingLoad: CircuitGraph | null
  projectId: string | null
  projectName: string | null

  setActiveMode: (mode: ActiveMode) => void
  setCircuitGraph: (graph: CircuitGraph) => void
  setSimulationState: (state: SimulationState | null) => void
  setSelectedComponentId: (id: string | null) => void
  setIsNarrating: (value: boolean) => void
  requestCircuitLoad: (graph: CircuitGraph) => void
  clearPendingLoad: () => void
  setProjectMeta: (id: string | null, name: string | null) => void
  clearCircuit: () => void
}

const emptyGraph: CircuitGraph = { components: [], edges: [] }

export const useCircuitStore = create<CircuitStore>((set) => ({
  activeMode: 'build',
  circuitGraph: emptyGraph,
  simulationState: null,
  selectedComponentId: null,
  isNarrating: false,
  pendingLoad: null,
  projectId: null,
  projectName: null,

  setActiveMode: (mode) => set({ activeMode: mode }),

  setCircuitGraph: (graph) => {
    const sim = simulate(graph)
    set({ circuitGraph: graph, simulationState: sim })
  },

  setSimulationState: (state) => set({ simulationState: state }),
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  setIsNarrating: (value) => set({ isNarrating: value }),

  requestCircuitLoad: (graph) => set({ pendingLoad: graph }),
  clearPendingLoad: () => set({ pendingLoad: null }),

  setProjectMeta: (id, name) => set({ projectId: id, projectName: name }),

  clearCircuit: () => {
    const sim = simulate(emptyGraph)
    set({
      circuitGraph: emptyGraph,
      simulationState: sim,
      selectedComponentId: null,
      projectId: null,
      projectName: null,
      pendingLoad: emptyGraph,
    })
  },
}))
