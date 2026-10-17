import { Router } from 'express'
import { getDashboardData } from '../controllers/dashboardController.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', getDashboardData)
