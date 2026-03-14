import { create } from 'zustand';
import {
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    MarkerType,
} from 'reactflow';

interface CircuitStore {
    nodes: Node[];
    edges: Edge[];
    simulationState: 'standby' | 'running' | 'fault';
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (node: Node) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    toggleSwitch: (id: string) => void;
    executeSimulation: () => void;
    triggerFault: () => void;
    resetSimulation: () => void;
    clearCanvas: () => void;
}

const initialNodes: Node[] = [
    {
        id: 'node-1',
        type: 'powerPlant',
        position: { x: 250, y: 50 },
        data: { label: 'Battery' },
    },
    {
        id: 'node-2',
        type: 'tollRoad',
        position: { x: 250, y: 250 },
        data: { label: 'Resistor', value: '330Ω', state: 'off' },
    },
    {
        id: 'node-3',
        type: 'district',
        position: { x: 250, y: 450 },
        data: { label: 'LED', state: 'off' },
    },
];

const initialEdges: Edge[] = [
    {
        id: 'e1-2',
        source: 'node-1',
        target: 'node-2',
        type: 'energyWire',
        data: { state: 'inactive' },
    },
    {
        id: 'e2-3',
        source: 'node-2',
        target: 'node-3',
        type: 'energyWire',
        data: { state: 'inactive' },
    },
    {
        id: 'e3-1',
        source: 'node-3',
        target: 'node-1',
        type: 'energyWire',
        data: { state: 'inactive' },
    },
];

const useCircuitStore = create<CircuitStore>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    simulationState: 'standby',

    onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    onConnect: (connection) => {
        set({
            edges: addEdge(
                { ...connection, type: 'energyWire', data: { state: 'active' } },
                get().edges,
            ),
        });
    },

    addNode: (node) => {
        set({ nodes: [...get().nodes, node] });
    },

    setNodes: (nodes) => set({ nodes }),

    setEdges: (edges) => set({ edges }),

    toggleSwitch: (id) => {
        const nodes = get().nodes.map((n) =>
            n.id === id
                ? { ...n, data: { ...n.data, isClosed: !(n.data.isClosed ?? true) } }
                : n
        );
        set({ nodes });
    },

    executeSimulation: () => {
        set({
            simulationState: 'running',
            nodes: get().nodes.map((n) => {
                if (n.type === 'district' || n.type === 'tollRoad') {
                    return { ...n, data: { ...n.data, state: 'healthy' } };
                }
                return n;
            }),
            edges: get().edges.map((e) => ({
                ...e,
                data: { ...e.data, state: 'active' },
            })),
        });
    },

    triggerFault: () => {
        set({
            simulationState: 'fault',
            nodes: get().nodes.map((n) => {
                if (n.type === 'district' || n.type === 'tollRoad') {
                    return { ...n, data: { ...n.data, state: 'overload' } };
                }
                return n;
            }),
            edges: get().edges.map((e) => ({
                ...e,
                data: { ...e.data, state: 'overload' },
            })),
        });
    },

    resetSimulation: () => {
        set({
            simulationState: 'standby',
            nodes: get().nodes.map((n) => {
                if (n.type === 'district' || n.type === 'tollRoad') {
                    return { ...n, data: { ...n.data, state: 'off' } };
                }
                return n;
            }),
            edges: get().edges.map((e) => ({
                ...e,
                data: { ...e.data, state: 'inactive' },
            })),
        });
    },

    clearCanvas: () => {
        set({ nodes: [], edges: [], simulationState: 'standby' });
    },
}));

export default useCircuitStore;
