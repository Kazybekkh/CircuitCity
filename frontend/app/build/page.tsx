'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef, type Ref, forwardRef } from 'react'
import CanvasToolbar from '../../components/CanvasToolbar'
import ComponentPalette from '../../components/ComponentPalette'
import ExplanationPanel from '../../components/ExplanationPanel'
import type { BuildCanvasHandle } from '../../components/BuildCanvas'

// Dynamically load the actual BuildCanvas (no SSR)
const BuildCanvasDynamic = dynamic(
  () => import('../../components/BuildCanvas'),
  { ssr: false },
)

// Wrap in forwardRef so we can pass ref through dynamic()
// eslint-disable-next-line react/display-name, @typescript-eslint/no-empty-object-type
const BuildCanvas = forwardRef<BuildCanvasHandle, {}>(
  function BuildCanvasWrapper(props, ref) {
    // BuildCanvasDynamic is the dynamically-loaded component; cast to accept ref
    const DynWithRef = BuildCanvasDynamic as React.ComponentType<{ ref?: Ref<BuildCanvasHandle> }>
    return <DynWithRef {...props} ref={ref} />
  },
)

const CityView = dynamic(
  () => import('../../components/CityView'),
  { ssr: false },
)

export default function BuildPage() {
  const canvasRef = useRef<BuildCanvasHandle>(null)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#030712',
        color: '#f9fafb',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 44,
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚔️</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#e2e8f0',
              letterSpacing: '0.02em',
            }}
          >
            Circuits as a Quest
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#22d3ee',
              background: '#0c4a6e',
              padding: '1px 8px',
              borderRadius: 10,
              border: '1px solid #0e7490',
            }}
          >
            Build Mode
          </span>
        </div>

        <Link
          href="/"
          style={{
            fontSize: 11,
            color: '#94a3b8',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 5,
            border: '1px solid #334155',
            background: '#1e293b',
            transition: 'all 0.12s',
          }}
        >
          ← Quest View
        </Link>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── Left panel: Canvas (55%) ────────────────────────────── */}
        <section
          style={{
            width: '55%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #1e293b',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Toolbar */}
          <CanvasToolbar
            onUndo={() => canvasRef.current?.undo()}
            onRedo={() => canvasRef.current?.redo()}
            onClear={() => canvasRef.current?.clear()}
            onExport={() => canvasRef.current?.export()}
            onSimulate={() => canvasRef.current?.simulate()}
            onSave={() => {
              // Save is handled inside BuildCanvas; trigger simulate first
              canvasRef.current?.simulate()
            }}
            canUndo={canvasRef.current?.canUndo ?? false}
            canRedo={canvasRef.current?.canRedo ?? false}
          />

          {/* Palette + Canvas row */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {/* Component palette strip */}
            <ComponentPalette />

            {/* React Flow canvas */}
            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <BuildCanvas ref={canvasRef} />
            </div>
          </div>
        </section>

        {/* ── Right panel: RPG view (45%) ─────────────────────────── */}
        <section
          style={{
            width: '45%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* City View (~60%) */}
          <div
            style={{
              flex: '0 0 60%',
              overflow: 'hidden',
              borderBottom: '1px solid #1e293b',
              background: '#0a0e1a',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 10,
                zIndex: 10,
                fontSize: 9,
                fontFamily: 'monospace',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                pointerEvents: 'none',
              }}
            >
              City View
            </div>
            <CityView />
          </div>

          {/* Explanation Panel (~40%) */}
          <div
            style={{
              flex: '0 0 40%',
              overflow: 'hidden',
              background: '#0f172a',
            }}
          >
            <div
              style={{
                padding: '4px 12px',
                borderBottom: '1px solid #1e293b',
                fontSize: 9,
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: '#0f172a',
              }}
            >
              Quest Log
            </div>
            <div style={{ height: 'calc(100% - 25px)', overflow: 'hidden' }}>
              <ExplanationPanel />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
