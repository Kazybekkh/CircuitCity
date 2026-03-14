'use client'

import { useCircuitStore } from '../store/circuitStore'

type Mode = 'build' | 'upload' | 'learn' | 'debug' | 'challenge'

const MODES: { id: Mode; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'upload', label: 'Upload' },
  { id: 'learn', label: 'Learn' },
  { id: 'debug', label: 'Debug' },
  { id: 'challenge', label: 'Challenge' },
]

export default function TopNav() {
  const { activeMode, setActiveMode } = useCircuitStore()

  return (
    <nav className="flex items-center justify-between bg-gray-900 text-white px-6 py-3 border-b border-gray-700">
      <h1 className="text-lg font-bold tracking-wide text-cyan-400">
        Circuits as a City
      </h1>
      <div className="flex gap-2">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeMode === mode.id
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
