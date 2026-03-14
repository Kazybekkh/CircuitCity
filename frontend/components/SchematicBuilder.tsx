'use client'

import { useCallback, useRef, useEffect, DragEvent, memo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  ConnectionMode,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useCircuitStore } from '../store/circuitStore'
import { ComponentType as CType, CircuitGraph } from '../../shared/types'
import UploadZone from './UploadZone'

/* ------------------------------------------------------------------ */
/*  Component palette configuration                                   */
/* ------------------------------------------------------------------ */

const CONFIGS: Record<CType, { label: string; color: string; symbol: string; defaultValue?: number }> = {
  battery:   { label: 'Battery',   color: '#22c55e', symbol: '+\u2212', defaultValue: 9 },
  resistor:  { label: 'Resistor',  color: '#f59e0b', symbol: '\u03A9',  defaultValue: 220 },
  led:       { label: 'LED',       color: '#ef4444', symbol: '\u25D0' },
  capacitor: { label: 'Capacitor', color: '#3b82f6', symbol: '||',      defaultValue: 100 },
  switch:    { label: 'Switch',    color: '#f97316', symbol: '\u2A2F',  defaultValue: 1 },
  motor:     { label: 'Motor',     color: '#8b5cf6', symbol: 'M' },
  ground:    { label: 'Ground',    color: '#94a3b8', symbol: '\u23DA' },
  wire:      { label: 'Wire',      color: '#6b7280', symbol: '\u2014' },
}

const PALETTE: CType[] = ['battery', 'resistor', 'led', 'capacitor', 'switch', 'motor', 'ground']

/* ------------------------------------------------------------------ */
/*  Custom React Flow node                                            */
/* ------------------------------------------------------------------ */

function CircuitNodeRaw({ id, data, selected }: NodeProps) {
  const simulationState = useCircuitStore(s => s.simulationState)
  const cs = simulationState?.componentStates.find(c => c.componentId === id)

  const powered = cs?.powered ?? false
  const currentFlow = cs?.currentFlow ?? 0
  const fault = cs?.fault
  const cfg = CONFIGS[data.componentType as CType] ?? CONFIGS.wire

  const borderColor = fault
    ? '#ef4444'
    : powered
      ? cfg.color
      : '#4b5563'

  const bg = fault
    ? 'rgba(127,29,29,0.6)'
    : powered
      ? `${cfg.color}22`
      : 'rgba(31,41,55,0.8)'

  const unitLabel =
    data.componentType === 'battery' ? `${data.value ?? ''}V` :
    data.componentType === 'resistor' ? `${data.value ?? ''}\u03A9` :
    data.componentType === 'capacitor' ? `${data.value ?? ''}\u00B5F` :
    data.componentType === 'switch' ? (data.value === 1 ? 'ON' : 'OFF') :
    null

  return (
    <div
      className={`relative px-3 py-2 rounded-lg border-2 min-w-[80px] text-center shadow-lg transition-all
        ${selected ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-gray-900' : ''}
        ${fault ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: bg, borderColor }}
    >
      <Handle type="target" position={Position.Left} id="left"
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-gray-900" />
      <Handle type="source" position={Position.Right} id="right"
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-gray-900" />

      <div className="text-lg leading-none mb-0.5 select-none" style={{ color: cfg.color }}>
        {cfg.symbol}
      </div>
      <div className="text-[11px] font-semibold text-white truncate max-w-[90px]">
        {data.label || cfg.label}
      </div>
      {unitLabel && (
        <div className="text-[10px] text-gray-400">{unitLabel}</div>
      )}

      {currentFlow > 0 && (
        <div
          className="absolute -bottom-1 left-1 right-1 h-1 rounded-full"
          style={{
            backgroundColor: currentFlow > 0.85 ? '#ef4444' : currentFlow > 0.5 ? '#f59e0b' : '#22c55e',
            opacity: 0.4 + currentFlow * 0.6,
          }}
        />
      )}
    </div>
  )
}

const CircuitNode = memo(CircuitNodeRaw)

const nodeTypes = { circuitNode: CircuitNode }

/* ------------------------------------------------------------------ */
/*  Inner builder (must be inside ReactFlowProvider)                   */
/* ------------------------------------------------------------------ */

function BuilderInner() {
  const rfInstance = useRef<ReactFlowInstance | null>(null)
  const { setCircuitGraph, pendingLoad, clearPendingLoad, setSelectedComponentId, activeMode, requestCircuitLoad } = useCircuitStore()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  /* ---------- sync React Flow → Zustand store ---------- */
  const prevGraphRef = useRef<string>('')

  useEffect(() => {
    const graph: CircuitGraph = {
      components: nodes.map(n => ({
        id: n.id,
        type: n.data.componentType,
        label: n.data.label,
        value: n.data.value,
        position: n.position,
      })),
      edges: edges.map(e => ({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        sourcePin: e.sourceHandle || undefined,
        targetPin: e.targetHandle || undefined,
      })),
    }
    const key = JSON.stringify(graph)
    if (key === prevGraphRef.current) return
    prevGraphRef.current = key
    setCircuitGraph(graph)
  }, [nodes, edges, setCircuitGraph])

  /* ---------- load preset / saved circuit ---------- */
  useEffect(() => {
    if (!pendingLoad) return
    const newNodes: Node[] = pendingLoad.components.map(c => ({
      id: c.id,
      type: 'circuitNode',
      position: c.position,
      data: { componentType: c.type, label: c.label, value: c.value },
    }))
    const newEdges: Edge[] = pendingLoad.edges.map(e => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      sourceHandle: e.sourcePin ?? null,
      targetHandle: e.targetPin ?? null,
      style: { stroke: '#06b6d4', strokeWidth: 2 },
      animated: true,
    }))
    setNodes(newNodes)
    setEdges(newEdges)
    clearPendingLoad()
    setTimeout(() => rfInstance.current?.fitView({ padding: 0.2 }), 50)
  }, [pendingLoad, clearPendingLoad, setNodes, setEdges])

  /* ---------- edge creation ---------- */
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge({ ...params, style: { stroke: '#06b6d4', strokeWidth: 2 }, animated: true }, eds),
      ),
    [setEdges],
  )

  /* ---------- drag-and-drop from palette ---------- */
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/circuitcomponent') as CType
      if (!type || !rfInstance.current) return

      const position = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const cfg = CONFIGS[type]
      const id = `${type}_${Math.random().toString(36).slice(2, 9)}`

      setNodes(nds => [
        ...nds,
        {
          id,
          type: 'circuitNode',
          position,
          data: { componentType: type, label: cfg.label, value: cfg.defaultValue },
        },
      ])
    },
    [setNodes],
  )

  /* ---------- node click / double-click ---------- */
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => setSelectedComponentId(node.id),
    [setSelectedComponentId],
  )

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.data.componentType === 'switch') {
        setNodes(nds =>
          nds.map(n =>
            n.id === node.id
              ? { ...n, data: { ...n.data, value: n.data.value === 1 ? 0 : 1 } }
              : n,
          ),
        )
      }
    },
    [setNodes],
  )

  const onPaneClick = useCallback(() => setSelectedComponentId(null), [setSelectedComponentId])

  const handleFileParsed = useCallback(
    (graph: CircuitGraph) => requestCircuitLoad(graph),
    [requestCircuitLoad],
  )

  return (
    <div className="h-full flex flex-col">
      {activeMode === 'upload' ? (
        /* upload zone — fixed height, scrollable */
        <div className="shrink-0 max-h-[50%] overflow-y-auto border-b border-gray-700">
          <UploadZone onParsed={handleFileParsed} />
        </div>
      ) : (
        /* component palette */
        <div className="flex gap-1 p-2 bg-gray-900 border-b border-gray-700 flex-wrap shrink-0">
          {PALETTE.map(type => {
            const c = CONFIGS[type]
            return (
              <div
                key={type}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/circuitcomponent', type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded cursor-grab text-xs font-medium
                           bg-gray-800 border border-gray-600 hover:border-cyan-500 transition-colors select-none"
                style={{ color: c.color }}
              >
                <span className="text-sm">{c.symbol}</span>
                <span>{c.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* canvas */}
      <div className="flex-1 min-h-[200px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={inst => { rfInstance.current = inst }}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-gray-950"
          connectionLineStyle={{ stroke: '#06b6d4', strokeWidth: 2 }}
          defaultEdgeOptions={{
            style: { stroke: '#06b6d4', strokeWidth: 2 },
            animated: true,
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls className="!bg-gray-800 !border-gray-600 [&>button]:!bg-gray-700 [&>button]:!border-gray-600 [&>button]:!fill-white" />
          <Background color="#374151" gap={20} variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper with provider                                     */
/* ------------------------------------------------------------------ */

export default function SchematicBuilder() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  )
}
