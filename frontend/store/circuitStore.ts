import { create } from 'zustand'
import { CircuitGraph, SimulationState } from '../../shared/types'

type ActiveMode = 'build' | 'upload' | 'learn' | 'debug' | 'challenge'

interface CircuitStore {
  // State
  activeMode: ActiveMode
  circuitGraph: CircuitGraph
  simulationState: SimulationState | null
  selectedComponentId: string | null
  isNarrating: boolean

  // Actions
  setActiveMode: (mode: ActiveMode) => void
  setCircuitGraph: (graph: CircuitGraph) => void
  setSimulationState: (state: SimulationState | null) => void
  setSelectedComponentId: (id: string | null) => void
  setIsNarrating: (value: boolean) => void
}

const emptyGraph: CircuitGraph = {
  components: [],
  edges: [],
}

export const useCircuitStore = create<CircuitStore>((set) => ({
  // Initial state
  activeMode: 'build',
  circuitGraph: emptyGraph,
  simulationState: null,
  selectedComponentId: null,
  isNarrating: false,

  // Actions
  setActiveMode: (mode) => set({ activeMode: mode }),
  setCircuitGraph: (graph) => set({ circuitGraph: graph }),
  setSimulationState: (state) => set({ simulationState: state }),
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  setIsNarrating: (value) => set({ isNarrating: value }),
}))
