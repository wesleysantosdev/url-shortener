import { Router } from 'express'
import shortenerRoutes from '../modules/shortener/shortener.routes'

const router = Router()

router.use('/', shortenerRoutes)

export default router
