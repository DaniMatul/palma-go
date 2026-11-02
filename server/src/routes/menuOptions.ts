import { Router } from 'express'
import { deleteMenuOption, getMenuOptions, postMenuOption, putMenuOption } from '../controllers/menuOptionsController.js'

export const menuOptionsRouter = Router()

menuOptionsRouter.get('/', getMenuOptions)
menuOptionsRouter.post('/', postMenuOption)
menuOptionsRouter.put('/:id', putMenuOption)
menuOptionsRouter.delete('/:id', deleteMenuOption)
