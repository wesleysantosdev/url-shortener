import express, { Application } from 'express'

export const app: Application = express()

app.get('/', (req, res) => {
  console.log('Request received')
  res.send('Hello World!')
})