import { Router, Request, Response } from 'express'
import multer from 'multer'
import { CircuitGraph } from '../../shared/types'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/upload
// Accepts a multipart/form-data image, returns a placeholder CircuitGraph
router.post('/', upload.single('image'), (_req: Request, res: Response) => {
  // TODO: implement image parsing with Gemini Vision (feature/ai-pipeline)
  const placeholderGraph: CircuitGraph = {
    components: [],
    edges: [],
  }

  res.json(placeholderGraph)
})

export default router
