import { create } from 'zustand'
import { CircuitGraph, SimulationState, CircuitComponent, CircuitEdge, ComponentType } from '../../shared/types'
import { simulate } from '../lib/simulationEngine'
import type { Node as RFNode, Edge as RFEdge } from 'reactflow'

type ActiveMode = 'build' | 'upload' | 'learn' | 'debug' | 'challenge'

export type CanvasStatus = 'idle' | 'drawing' | 'simulating' | 'updated' | 'incomplete' | 'fault'

// Extra canvas component types that map to CircuitGraph types for simulation
const TYPE_MAP: Record<string, ComponentType> = {
  inductor: 'resistor',
  diode: 'led',
  voltage_source: 'battery',
  current_source: 'battery',
}

interface CircuitStore {
  activeMode: ActiveMode
  circuitGraph: CircuitGraph
  simulationState: SimulationState | null
  selectedComponentId: string | null
  isNarrating: boolean
  pendingLoad: CircuitGraph | null
  projectId: string | null
  projectName: string | null

  // Canvas-specific additions
  canvasNodes: RFNode[]
  canvasEdges: RFEdge[]
  isDirty: boolean
  canvasStatus: CanvasStatus

  setActiveMode: (mode: ActiveMode) => void
  setCircuitGraph: (graph: CircuitGraph) => void
  setSimulationState: (state: SimulationState | null) => void
  setSelectedComponentId: (id: string | null) => void
  setIsNarrating: (value: boolean) => void
  requestCircuitLoad: (graph: CircuitGraph) => void
  clearPendingLoad: () => void
  setProjectMeta: (id: string | null, name: string | null) => void
  clearCircuit: () => void

  setCanvasNodes: (nodes: RFNode[]) => void
  setCanvasEdges: (edges: RFEdge[]) => void
  setIsDirty: (dirty: boolean) => void
  setCanvasStatus: (status: CanvasStatus) => void
  canvasToCircuitGraph: () => CircuitGraph
}

const emptyGraph: CircuitGraph = { components: [], edges: [] }

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  activeMode: 'build',
  circuitGraph: emptyGraph,
  simulationState: null,
  selectedComponentId: null,
  isNarrating: false,
  pendingLoad: null,
  projectId: null,
  projectName: null,

  // Canvas-specific initial state
  canvasNodes: [],
  canvasEdges: [],
  isDirty: false,
  canvasStatus: 'idle',

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

  setCanvasNodes: (nodes) => set({ canvasNodes: nodes }),
  setCanvasEdges: (edges) => set({ canvasEdges: edges }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setCanvasStatus: (status) => set({ canvasStatus: status }),

  canvasToCircuitGraph: (): CircuitGraph => {
    const { canvasNodes, canvasEdges } = get()

    const components: CircuitComponent[] = canvasNodes.map((node) => {
      const rawType = (node.data?.componentType as string) ?? 'wire'
      const mappedType = (TYPE_MAP[rawType] ?? rawType) as ComponentType
      const validTypes: ComponentType[] = ['battery', 'wire', 'resistor', 'led', 'capacitor', 'switch', 'ground', 'motor']
      const finalType: ComponentType = validTypes.includes(mappedType) ? mappedType : 'wire'

      return {
        id: node.id,
        type: finalType,
        label: (node.data?.label as string) ?? rawType,
        value: node.data?.value as number | undefined,
        position: { x: node.position.x, y: node.position.y },
      }
    })

    const edges: CircuitEdge[] = canvasEdges.map((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      sourcePin: edge.sourceHandle ?? undefined,
      targetPin: edge.targetHandle ?? undefined,
    }))

    return { components, edges }
  },
}))
