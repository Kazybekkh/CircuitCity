import { Router, Request, Response } from 'express'
import { CircuitProjectModel } from '../models/CircuitProject'

const router = Router()

// GET /api/projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await CircuitProjectModel.find().sort({ updatedAt: -1 })
    res.json(projects)
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  try {
    const project = new CircuitProjectModel(req.body)
    const saved = await project.save()
    res.status(201).json(saved)
  } catch {
    res.status(400).json({ error: 'Failed to create project' })
  }
})

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await CircuitProjectModel.findById(req.params.id)
    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(project)
  } catch {
    res.status(404).json({ error: 'Project not found' })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await CircuitProjectModel.findByIdAndDelete(req.params.id)
    res.json({ deleted: true })
  } catch {
    res.status(404).json({ error: 'Project not found' })
  }
})

export default router
