import { Router } from 'express'
import { deleteMenuItem, getMenuItems, postMenuItem, putMenuItem } from '../controllers/menuItemsController.js'

export const menuItemsRouter = Router()

menuItemsRouter.get('/', getMenuItems)
menuItemsRouter.post('/', postMenuItem)
menuItemsRouter.put('/:id', putMenuItem)
menuItemsRouter.delete('/:id', deleteMenuItem)
