import { Router, Request, Response } from 'express'
import { CircuitGraph, SimulationState } from '../../shared/types'

const router = Router()

// POST /api/simulate
// Accepts a CircuitGraph and returns a placeholder SimulationState
router.post('/', (req: Request, res: Response) => {
  const graph: CircuitGraph = req.body

  // TODO: implement actual simulation logic (feature/simulation-engine)
  const placeholderState: SimulationState = {
    isValid: true,
    componentStates: graph.components.map((c) => ({
      componentId: c.id,
      powered: false,
      currentFlow: 0,
    })),
    faults: [],
    commentary: 'Simulation engine not yet implemented.',
  }

  res.json(placeholderState)
})

export default router
