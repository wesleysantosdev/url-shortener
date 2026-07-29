import express, { Application } from 'express'
import router from './routes'
import {
  errorHandler,
  errorLogger,
  notFound,
} from './shared/middleware'

export const app: Application = express()

app.use(express.json())
app.use('/api', router)
app.use(notFound)
app.use(errorLogger)
app.use(errorHandler)
