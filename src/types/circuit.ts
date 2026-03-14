export type CircuitNodeType = 'powerPlant' | 'district' | 'tollRoad' | 'switch' | 'ground';

export interface CircuitNodeData {
    label?: string;
    isPowered?: boolean;
    state?: 'healthy' | 'overload' | 'off';
    value?: string;
    isClosed?: boolean;
    [key: string]: any;
}

export interface CircuitNode {
    id: string;
    type: CircuitNodeType;
    data: CircuitNodeData;
    position: { x: number; y: number };
}

export interface CircuitEdge {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
}
