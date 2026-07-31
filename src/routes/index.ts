import { Router } from 'express'
import shortenerRoutes from '../modules/shortener/shortener.routes'
import redirectRoutes from '../modules/shortener/redirect.routes'

const router = Router()

router.use('/', shortenerRoutes)
router.use('/', redirectRoutes)

export default router
