'use client'

import dynamic from 'next/dynamic'
import { useCircuitStore } from '../store/circuitStore'
import TopNav from '../components/TopNav'
import SchematicBuilder from '../components/SchematicBuilder'
import ExplanationPanel from '../components/ExplanationPanel'

const CityView = dynamic(() => import('../components/CityView'), { ssr: false })

export default function Home() {
  const { activeMode, simulationState } = useCircuitStore()

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Three-Panel Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel — Schematic Builder (30%) */}
        <section className="w-[30%] flex flex-col border-r border-gray-700">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Schematic Builder
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <SchematicBuilder />
          </div>
        </section>

        {/* Centre Panel — City View (40%) */}
        <section className="w-[40%] flex flex-col border-r border-gray-700">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              City View
            </h2>
          </div>
          <div className="flex-1 overflow-hidden" style={{ background: '#1a1a2e' }}>
            <CityView />
          </div>
        </section>

        {/* Right Panel — Explanation (30%) */}
        <section className="w-[30%] flex flex-col">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Explanation
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ExplanationPanel />
          </div>
        </section>
      </main>

      {/* Bottom Status Bar */}
      <footer className="flex items-center justify-between bg-gray-900 border-t border-gray-700 px-6 py-1.5 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          <span>Connected</span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Mode:{' '}
            <span className="text-cyan-400 capitalize font-medium">
              {activeMode}
            </span>
          </span>
          <span className="text-gray-500">|</span>
          <span>
            {simulationState?.faults?.length
              ? `${simulationState.faults.length} fault(s) detected`
              : 'No faults detected'}
          </span>
        </div>
      </footer>
    </div>
  )
}
