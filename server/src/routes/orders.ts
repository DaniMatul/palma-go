import { Router } from 'express'
import { getOrders, patchOrderStatus, postOrder } from '../controllers/ordersController.js'

export const ordersRouter = Router()

ordersRouter.get('/', getOrders)
ordersRouter.post('/', postOrder)
ordersRouter.patch('/:id/status', patchOrderStatus)
