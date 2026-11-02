import { Router } from 'express'
import { getMenuItemOptions, putMenuItemOptions } from '../controllers/menuItemOptionsController.js'

export const menuItemOptionsRouter = Router()

menuItemOptionsRouter.get('/:menuItemId/options', getMenuItemOptions)
menuItemOptionsRouter.put('/:menuItemId/options', putMenuItemOptions)
