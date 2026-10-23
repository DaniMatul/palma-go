import { Router } from 'express'
import { getDailyMenuController, postDailyMenuController, putDailyMenuController, resetDailyMenuController } from '../controllers/dailyMenuController.js'

export const dailyMenuRouter = Router()

dailyMenuRouter.get('/', getDailyMenuController)
dailyMenuRouter.post('/reset', resetDailyMenuController)
dailyMenuRouter.post('/', postDailyMenuController)
dailyMenuRouter.put('/', putDailyMenuController)
