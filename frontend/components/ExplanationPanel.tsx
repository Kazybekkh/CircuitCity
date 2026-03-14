'use client'

import { useCircuitStore } from '../store/circuitStore'

export default function ExplanationPanel() {
  const { simulationState, isNarrating } = useCircuitStore()

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex-1 bg-gray-800 rounded-lg p-4 text-gray-300 text-sm overflow-y-auto">
        {simulationState?.commentary ? (
          <p>{simulationState.commentary}</p>
        ) : (
          <p className="text-gray-500 italic">No explanation yet</p>
        )}
      </div>

      {/* Audio player placeholder */}
      <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
        <button
          disabled={!isNarrating}
          className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 cursor-not-allowed"
          aria-label="Play narration"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
          <div className="bg-gray-500 h-1.5 rounded-full w-0" />
        </div>
        <span className="text-xs text-gray-500">0:00</span>
      </div>
    </div>
  )
}
