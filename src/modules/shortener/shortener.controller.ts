import { Request, Response } from 'express'
import { CreateShortUrlBody } from './shortener.schema'
import shortenerService from './shortener.service'

const shortenerController = {
  async createShortUrl(
    request: Request<object, object, CreateShortUrlBody>,
    response: Response,
  ): Promise<Response> {
    const { url } = request.body
    const data = await shortenerService.createShortUrl(url)

    return response.status(201).json({
      message: 'Short URL created successfully',
      data,
    })
  },
}

export default shortenerController
