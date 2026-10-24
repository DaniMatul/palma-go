import { Router } from 'express'
import { deleteComponentCatalog, getComponentCatalog, postComponentCatalog, putComponentCatalog } from '../controllers/componentCatalogController.js'

export const componentCatalogRouter = Router()
componentCatalogRouter.get('/', getComponentCatalog)
componentCatalogRouter.post('/', postComponentCatalog)
componentCatalogRouter.put('/:id', putComponentCatalog)
componentCatalogRouter.delete('/:id', deleteComponentCatalog)
