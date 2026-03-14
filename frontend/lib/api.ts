import { CircuitGraph, SimulationState, CircuitProject } from '../../shared/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function fetchProjects(): Promise<CircuitProject[]> {
  const res = await fetch(`${API_BASE}/api/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function fetchProject(id: string): Promise<CircuitProject> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`)
  if (!res.ok) throw new Error('Project not found')
  return res.json()
}

export async function saveProject(
  name: string,
  graph: CircuitGraph,
  simulationState?: SimulationState | null,
): Promise<CircuitProject> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, graph, simulationState }),
  })
  if (!res.ok) throw new Error('Failed to save project')
  return res.json()
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; graph: CircuitGraph; simulationState: SimulationState }>,
): Promise<CircuitProject> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update project')
  return res.json()
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete project')
}

export async function runSimulationOnServer(graph: CircuitGraph): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}
