import { Request, Response } from 'express'
import shortenerService from './shortener.service'

const shortnerController = {
  async createShortUrl(req: Request, res: Response) {
    try {
      const { url } = req.body
      const data = await shortenerService.createShortUrl(url)

      res.status(201).send({message: 'Short URL created successfully', data})
    } catch (error) {
      res.status(500).send({message: 'Error creating short URL'})
    }
  },
}

export default shortnerController
