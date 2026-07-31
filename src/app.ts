import express, { Application } from 'express'
import redirectRoutes from './modules/shortener/redirect.routes'
import router from './routes'
import {
  errorHandler,
  errorLogger,
  notFound,
} from './shared/middleware'

export const app: Application = express()

app.use(express.json())
app.use('/api', router)
app.use('/', redirectRoutes)
app.use(notFound)
app.use(errorLogger)
app.use(errorHandler)
