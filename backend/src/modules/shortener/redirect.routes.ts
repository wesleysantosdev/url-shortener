import { Router } from 'express'
import shortenerController from './shortener.controller'

const redirectRoutes = Router()

redirectRoutes.get('/:shortCode', shortenerController.redirectToOriginalUrl)

export default redirectRoutes
