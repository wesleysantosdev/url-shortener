import { Router } from 'express'

const shortenerRoutes = Router()

shortenerRoutes.post('/v1/shortener', (req, res) => {
  res.send('Shortener route is working!')
})

export default shortenerRoutes