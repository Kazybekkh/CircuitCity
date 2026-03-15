'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useCircuitStore } from '../../store/circuitStore'

// ─── Biome colour map ───────────────────────────────────────────────────────

const BIOME_COLORS: Record<string, string> = {
  battery: '#f59e0b',
  voltage_source: '#f59e0b',
  wire: '#22c55e',
  resistor: '#a16207',
  inductor: '#0369a1',
  capacitor: '#4338ca',
  led: '#f97316',
  diode: '#f97316',
  switch: '#6b7280',
  ground: '#7c3aed',
  motor: '#8b5cf6',
  current_source: '#ec4899',
}

// ─── SVG Symbols ────────────────────────────────────────────────────────────

function BatterySymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* Left lead */}
      <line x1="2" y1="12" x2="6" y2="12" />
      {/* Long plate (positive) */}
      <line x1="6" y1="8" x2="6" y2="16" strokeWidth="2" />
      {/* Short plate (negative) */}
      <line x1="9" y1="10" x2="9" y2="14" strokeWidth="1.5" />
      {/* Long plate 2 */}
      <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2" />
      {/* Short plate 2 */}
      <line x1="15" y1="10" x2="15" y2="14" strokeWidth="1.5" />
      {/* Right lead */}
      <line x1="18" y1="12" x2="22" y2="12" />
      {/* + label */}
      <text x="7.5" y="7" fontSize="4" fill="currentColor" stroke="none" textAnchor="middle">+</text>
      {/* - label */}
      <text x="13.5" y="7" fontSize="4" fill="currentColor" stroke="none" textAnchor="middle">−</text>
    </svg>
  )
}

function VoltageSourceSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="7" y2="12" />
      <circle cx="12" cy="12" r="5" />
      <text x="12" y="15" fontSize="6" fill="currentColor" stroke="none" textAnchor="middle" fontWeight="bold">V</text>
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function ResistorSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* IEC rectangle style */}
      <line x1="2" y1="12" x2="5" y2="12" />
      <rect x="5" y="9" width="14" height="6" rx="1" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function CapacitorSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="10" y2="12" />
      <line x1="10" y1="7" x2="10" y2="17" strokeWidth="2" />
      <line x1="14" y1="7" x2="14" y2="17" strokeWidth="2" />
      <line x1="14" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function InductorSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="5" y2="12" />
      {/* Three humps */}
      <path d="M5 12 Q7 8 9 12 Q11 8 13 12 Q15 8 17 12 Q19 8 21 12" fill="none" />
      <line x1="21" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function LEDSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="7" y2="12" />
      {/* Triangle */}
      <polygon points="7,8 7,16 15,12" />
      {/* Bar */}
      <line x1="15" y1="8" x2="15" y2="16" />
      <line x1="15" y1="12" x2="22" y2="12" />
      {/* Light arrows */}
      <line x1="17" y1="7" x2="20" y2="4" strokeWidth="1" />
      <line x1="19" y1="9" x2="22" y2="6" strokeWidth="1" />
    </svg>
  )
}

function DiodeSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="7" y2="12" />
      <polygon points="7,8 7,16 15,12" />
      <line x1="15" y1="8" x2="15" y2="16" />
      <line x1="15" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function SwitchSymbol({ value }: { value?: number }) {
  const closed = value === 1
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="7" y2="12" />
      {/* Left contact dot */}
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      {/* Right contact dot */}
      <circle cx="17" cy="12" r="1" fill="currentColor" />
      {closed ? (
        /* Closed: line through */
        <line x1="7" y1="12" x2="17" y2="12" />
      ) : (
        /* Open: angled line */
        <line x1="7" y1="12" x2="16" y2="8" />
      )}
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function GroundSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="2" x2="12" y2="10" />
      <line x1="6" y1="10" x2="18" y2="10" strokeWidth="2" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="10" y1="16" x2="14" y2="16" />
      <line x1="11" y1="19" x2="13" y2="19" />
    </svg>
  )
}

function MotorSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="7" y2="12" />
      <circle cx="12" cy="12" r="5" />
      <text x="12" y="15" fontSize="6" fill="currentColor" stroke="none" textAnchor="middle" fontWeight="bold">M</text>
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function CurrentSourceSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="7" y2="12" />
      <circle cx="12" cy="12" r="5" />
      {/* Arrow inside circle */}
      <line x1="10" y1="12" x2="14" y2="12" />
      <polyline points="12,9 15,12 12,15" fill="none" />
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function WireSymbol() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <line x1="2" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function ComponentSymbol({ type, value }: { type: string; value?: number }) {
  switch (type) {
    case 'battery': return <BatterySymbol />
    case 'voltage_source': return <VoltageSourceSymbol />
    case 'resistor': return <ResistorSymbol />
    case 'capacitor': return <CapacitorSymbol />
    case 'inductor': return <InductorSymbol />
    case 'led': return <LEDSymbol />
    case 'diode': return <DiodeSymbol />
    case 'switch': return <SwitchSymbol value={value} />
    case 'ground': return <GroundSymbol />
    case 'motor': return <MotorSymbol />
    case 'current_source': return <CurrentSourceSymbol />
    case 'wire': return <WireSymbol />
    default: return <ResistorSymbol />
  }
}

// ─── Context Menu ────────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onEditValue: () => void
  onClose: () => void
}

function ContextMenu({ x, y, onDelete, onEditValue, onClose }: ContextMenuProps) {
  return (
    <>
      {/* Backdrop to close */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 1000,
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          minWidth: 120,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => { onEditValue(); onClose() }}
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 12px',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: '#d1d5db',
            fontSize: 12,
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          Edit Value
        </button>
        <button
          onClick={() => { onDelete(); onClose() }}
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 12px',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: '#f87171',
            fontSize: 12,
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#3f2020')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          Delete
        </button>
      </div>
    </>
  )
}

// ─── Main Node Component ─────────────────────────────────────────────────────

export interface CircuitNodeData {
  componentType: string
  label: string
  value?: number
  unit?: string
  onDelete?: (id: string) => void
  onValueChange?: (id: string, value: number) => void
}

function CircuitComponentNode({ id, data, selected }: NodeProps<CircuitNodeData>) {
  const { simulationState } = useCircuitStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [editingValue, setEditingValue] = useState(false)
  const [editValue, setEditValue] = useState<string>(String(data.value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)

  const compType = data.componentType ?? 'wire'
  const biomeColor = BIOME_COLORS[compType] ?? '#6b7280'

  // Get simulation state for this node
  const compState = simulationState?.componentStates.find(cs => cs.componentId === id)
  const isPowered = compState?.powered ?? false
  const isFaulted = !!compState?.fault
  const currentFlow = compState?.currentFlow ?? 0

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  const handleEditValue = useCallback(() => {
    setEditValue(String(data.value ?? ''))
    setEditingValue(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [data.value])

  const handleValueSubmit = useCallback(() => {
    const num = parseFloat(editValue)
    if (!isNaN(num)) {
      data.onValueChange?.(id, num)
    }
    setEditingValue(false)
  }, [editValue, data, id])

  // Border style based on state
  let borderColor = biomeColor
  let boxShadow = 'none'

  if (selected) {
    borderColor = '#22d3ee'
    boxShadow = `0 0 0 2px #22d3ee`
  } else if (isFaulted) {
    borderColor = '#ef4444'
    boxShadow = `0 0 8px #ef4444`
  } else if (isPowered) {
    boxShadow = `0 0 8px ${biomeColor}88`
  }

  const valueLabel = data.value !== undefined
    ? `${data.value}${data.unit ?? ''}`
    : null

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        style={{
          background: '#111827',
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          padding: '6px 8px',
          minWidth: 64,
          minHeight: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          cursor: 'grab',
          position: 'relative',
          boxShadow,
          animation: isFaulted ? 'faultPulse 1s ease-in-out infinite' : undefined,
        }}
      >
        {/* 4 connection handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{
            background: biomeColor,
            width: 8,
            height: 8,
            border: '2px solid #111827',
            top: -5,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{
            background: biomeColor,
            width: 8,
            height: 8,
            border: '2px solid #111827',
            bottom: -5,
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{
            background: biomeColor,
            width: 8,
            height: 8,
            border: '2px solid #111827',
            left: -5,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{
            background: biomeColor,
            width: 8,
            height: 8,
            border: '2px solid #111827',
            right: -5,
          }}
        />

        {/* SVG symbol */}
        <div
          style={{
            color: isPowered ? biomeColor : isFaulted ? '#ef4444' : '#9ca3af',
            width: 24,
            height: 24,
            flexShrink: 0,
          }}
        >
          <ComponentSymbol type={compType} value={data.value} />
        </div>

        {/* Component label */}
        <span
          style={{
            fontSize: 9,
            color: '#9ca3af',
            fontFamily: 'monospace',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.label}
        </span>

        {/* Value label */}
        {editingValue ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleValueSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleValueSubmit()
              if (e.key === 'Escape') setEditingValue(false)
              e.stopPropagation()
            }}
            style={{
              width: 48,
              fontSize: 9,
              fontFamily: 'monospace',
              background: '#1f2937',
              border: `1px solid ${biomeColor}`,
              borderRadius: 3,
              color: '#f9fafb',
              padding: '1px 3px',
              textAlign: 'center',
            }}
            className="nodrag nopan"
          />
        ) : valueLabel ? (
          <span
            style={{
              fontSize: 9,
              color: biomeColor,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            {valueLabel}
          </span>
        ) : null}

        {/* Powered flow bar */}
        {isPowered && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              left: 4,
              right: 4,
              height: 2,
              background: '#374151',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${currentFlow * 100}%`,
                background: currentFlow > 0.85 ? '#ef4444' : currentFlow > 0.4 ? '#eab308' : '#3b82f6',
                borderRadius: 1,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={handleDelete}
          onEditValue={handleEditValue}
          onClose={() => setContextMenu(null)}
        />
      )}

      <style>{`
        @keyframes faultPulse {
          0%, 100% { box-shadow: 0 0 4px #ef4444; }
          50% { box-shadow: 0 0 16px #ef4444, 0 0 4px #ef4444 inset; }
        }
      `}</style>
    </>
  )
}

export default memo(CircuitComponentNode)
