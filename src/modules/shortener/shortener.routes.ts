import { Router } from 'express'
import shortnerController from './shortner.controller'

const shortenerRoutes = Router()

shortenerRoutes.post('/v1/shortener', shortnerController.createShortUrl)

export default shortenerRoutes