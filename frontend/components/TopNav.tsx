'use client'

import { useState } from 'react'
import { useCircuitStore } from '../store/circuitStore'
import { saveProject, fetchProjects } from '../lib/api'
import { CircuitProject } from '../../shared/types'

type Mode = 'build' | 'upload' | 'learn' | 'debug' | 'challenge'

const MODES: { id: Mode; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'upload', label: 'Upload' },
  { id: 'learn', label: 'Learn' },
  { id: 'debug', label: 'Debug' },
  { id: 'challenge', label: 'Challenge' },
]

export default function TopNav() {
  const {
    activeMode,
    setActiveMode,
    circuitGraph,
    simulationState,
    requestCircuitLoad,
    setProjectMeta,
    clearCircuit,
    projectName,
  } = useCircuitStore()

  const [saving, setSaving] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [projects, setProjects] = useState<CircuitProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const handleSave = async () => {
    const name = window.prompt('Project name:', projectName || 'My Circuit')
    if (!name) return
    setSaving(true)
    try {
      const saved = await saveProject(name, circuitGraph, simulationState)
      setProjectMeta(saved._id ?? null, name)
    } catch (err) {
      console.error('Save failed:', err)
      window.alert('Failed to save — is the backend running?')
    } finally {
      setSaving(false)
    }
  }

  const handleLoadToggle = async () => {
    if (loadOpen) { setLoadOpen(false); return }
    setLoadingProjects(true)
    try {
      const list = await fetchProjects()
      setProjects(list)
      setLoadOpen(true)
    } catch {
      window.alert('Failed to load projects — is the backend running?')
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleLoadProject = (proj: CircuitProject) => {
    requestCircuitLoad(proj.graph)
    setProjectMeta(proj._id ?? null, proj.name)
    setLoadOpen(false)
  }

  return (
    <nav className="relative flex items-center justify-between bg-gray-900 text-white px-6 py-3 border-b border-gray-700">
      <h1 className="text-lg font-bold tracking-wide text-cyan-400">Circuits as a City</h1>

      {/* mode tabs */}
      <div className="flex gap-2">
        {MODES.map(mode => (
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

      {/* project actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={clearCircuit}
          className="px-3 py-1.5 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
        >
          New
        </button>
        <button
          onClick={handleSave}
          disabled={saving || circuitGraph.components.length === 0}
          className="px-3 py-1.5 rounded text-xs font-medium bg-cyan-700 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleLoadToggle}
          disabled={loadingProjects}
          className="px-3 py-1.5 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 transition-colors"
        >
          {loadingProjects ? 'Loading...' : 'Load'}
        </button>
      </div>

      {/* load dropdown */}
      {loadOpen && (
        <div className="absolute right-6 top-full mt-1 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {projects.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center">No saved projects</p>
          ) : (
            projects.map(proj => (
              <button
                key={proj._id}
                onClick={() => handleLoadProject(proj)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
              >
                <span className="font-medium text-white">{proj.name}</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">
                  {proj.graph.components.length} components &middot;{' '}
                  {new Date(proj.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </nav>
  )
}
