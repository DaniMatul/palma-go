import { Router } from 'express'
import { getDailyMenuOptionsController, putDailyMenuOptionsController } from '../controllers/dailyMenuOptionsController.js'

export const dailyMenuOptionsRouter = Router()

dailyMenuOptionsRouter.get('/', getDailyMenuOptionsController)
dailyMenuOptionsRouter.put('/', putDailyMenuOptionsController)
