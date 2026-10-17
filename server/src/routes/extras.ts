import { Router } from 'express'
import { deleteExtra, getExtras, postExtra, putExtra } from '../controllers/extrasController.js'

export const extrasRouter = Router()

extrasRouter.get('/', getExtras)
extrasRouter.post('/', postExtra)
extrasRouter.put('/:id', putExtra)
extrasRouter.delete('/:id', deleteExtra)
