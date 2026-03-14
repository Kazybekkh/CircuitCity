'use client';

import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  ReactFlowInstance,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import PowerPlantNode from '@/components/nodes/PowerPlantNode';
import DistrictNode from '@/components/nodes/DistrictNode';
import TollRoadNode from '@/components/nodes/TollRoadNode';
import SwitchNode from '@/components/nodes/SwitchNode';
import GroundNode from '@/components/nodes/GroundNode';
import EnergyWire from '@/components/edges/EnergyWire';
import Sidebar from '@/components/Sidebar';
import ControlPanel from '@/components/ControlPanel';
import useCircuitStore from '@/store/useCircuitStore';

const nodeTypes = {
  powerPlant: PowerPlantNode,
  district: DistrictNode,
  tollRoad: TollRoadNode,
  switch: SwitchNode,
  ground: GroundNode,
};

const edgeTypes = {
  energyWire: EnergyWire,
};

const defaultEdgeOptions = { type: 'energyWire' as const };

let nodeId = 100;
const getNextId = () => `node-${nodeId++}`;

const defaultDataByType: Record<string, Record<string, unknown>> = {
  powerPlant: { label: 'Battery' },
  tollRoad: { label: 'Resistor', value: '1kΩ' },
  district: { label: 'LED', state: 'off' },
  switch: { label: 'Switch', isClosed: true },
  ground: { label: 'Ground' },
};

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const nodes = useCircuitStore((s) => s.nodes);
  const edges = useCircuitStore((s) => s.edges);
  const onNodesChange = useCircuitStore((s) => s.onNodesChange);
  const onEdgesChange = useCircuitStore((s) => s.onEdgesChange);
  const onConnect = useCircuitStore((s) => s.onConnect);
  const addNode = useCircuitStore((s) => s.addNode);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNextId(),
        type,
        position,
        data: { ...(defaultDataByType[type] ?? {}) },
      };

      addNode(newNode);
    },
    [addNode],
  );

  return (
    <div className="flex h-screen w-screen bg-[#0b0c10] font-sans text-white overflow-hidden">
      {/* Floating Sidebar Container */}
      <div className="absolute top-6 left-6 bottom-6 z-30 pointer-events-none">
        <Sidebar />
      </div>

      <div ref={reactFlowWrapper} className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => { reactFlowInstance.current = instance; }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
        >
          <Background color="#ffffff" gap={25} size={1} variant={BackgroundVariant.Dots} style={{ opacity: 0.05 }} />
          <Controls />
        </ReactFlow>

        <ControlPanel />

        {/* Minimal Header */}
        <div className="absolute top-6 left-[300px] z-10 pointer-events-none flex items-center gap-4">
          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-2xl">
            <div className="w-6 h-6 bg-[#0b0c10] rounded-sm flex items-center justify-center font-black text-white text-xs">M</div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">
              Metro<span className="text-gray-400">Ohm</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em] -mt-1">
              Industrial Digital Twin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CircuitCityPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
