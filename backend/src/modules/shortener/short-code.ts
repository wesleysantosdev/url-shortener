import { randomInt } from 'node:crypto'

const BASE62_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const SHORT_CODE_LENGTH = 8

type RandomIndex = (maximum: number) => number

export class ShortCodeCollisionError extends Error {
  constructor(options?: ErrorOptions) {
    super('Generated short code already exists', options)
    this.name = 'ShortCodeCollisionError'
  }
}

/** Generates one case-sensitive eight-character Base62 shortcode. */
export function generateShortCode(
  randomIndex: RandomIndex = randomInt,
): string {
  let shortCode = ''

  for (let index = 0; index < SHORT_CODE_LENGTH; index += 1) {
    shortCode += BASE62_ALPHABET[randomIndex(BASE62_ALPHABET.length)]
  }

  return shortCode
}
