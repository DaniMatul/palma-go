import { Router } from 'express'
import { getDailyMenuController, patchDailyMenuPinController, postDailyMenuController, putDailyMenuController, resetDailyMenuController } from '../controllers/dailyMenuController.js'

export const dailyMenuRouter = Router()

dailyMenuRouter.get('/', getDailyMenuController)
dailyMenuRouter.patch('/:id/pin', patchDailyMenuPinController)
dailyMenuRouter.post('/reset', resetDailyMenuController)
dailyMenuRouter.post('/', postDailyMenuController)
dailyMenuRouter.put('/', putDailyMenuController)
