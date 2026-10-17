import { Router } from 'express'
import { getDailyMenuController, putDailyMenuController } from '../controllers/dailyMenuController.js'

export const dailyMenuRouter = Router()

dailyMenuRouter.get('/', getDailyMenuController)
dailyMenuRouter.put('/', putDailyMenuController)
