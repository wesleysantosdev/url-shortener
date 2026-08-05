import { createHmac } from 'node:crypto'

const BASE62_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE = BigInt(BASE62_ALPHABET.length)
const MINIMUM_SHORT_CODE_LENGTH = 4
const MAXIMUM_SHORT_CODE_LENGTH = 6

export const SHORT_CODE_CAPACITY = BASE ** BigInt(MAXIMUM_SHORT_CODE_LENGTH)

function greatestCommonDivisor(first: bigint, second: bigint): bigint {
  let left = first
  let right = second

  while (right !== 0n) {
    ;[left, right] = [right, left % right]
  }

  return left
}

function modulo(value: bigint, divisor: bigint): bigint {
  const remainder = value % divisor
  return remainder >= 0n ? remainder : remainder + divisor
}

function modularInverse(value: bigint, modulus: bigint): bigint {
  let [oldRemainder, remainder] = [value, modulus]
  let [oldCoefficient, coefficient] = [1n, 0n]

  while (remainder !== 0n) {
    const quotient = oldRemainder / remainder
    ;[oldRemainder, remainder] = [
      remainder,
      oldRemainder - quotient * remainder,
    ]
    ;[oldCoefficient, coefficient] = [
      coefficient,
      oldCoefficient - quotient * coefficient,
    ]
  }

  return modulo(oldCoefficient, modulus)
}

function secretNumber(secret: string, purpose: string): bigint {
  const digest = createHmac('sha256', secret).update(purpose).digest('hex')
  return BigInt(`0x${digest}`)
}

function deriveMultiplier(secret: string): bigint {
  let multiplier = secretNumber(secret, 'short-code-multiplier') % SHORT_CODE_CAPACITY

  while (greatestCommonDivisor(multiplier, SHORT_CODE_CAPACITY) !== 1n) {
    multiplier = (multiplier + 1n) % SHORT_CODE_CAPACITY
  }

  return multiplier
}

function encodeBase62(value: bigint): string {
  let remaining = value
  let encoded = ''

  do {
    const index = Number(remaining % BASE)
    encoded = `${BASE62_ALPHABET[index]}${encoded}`
    remaining /= BASE
  } while (remaining > 0n)

  return encoded.padStart(MINIMUM_SHORT_CODE_LENGTH, BASE62_ALPHABET[0])
}

function decodeBase62(shortCode: string): bigint {
  let decoded = 0n

  for (const character of shortCode) {
    const index = BASE62_ALPHABET.indexOf(character)

    if (index === -1) {
      throw new Error(`Invalid shortcode ${JSON.stringify(shortCode)}: expected Base62 characters`)
    }

    decoded = decoded * BASE + BigInt(index)
  }

  return decoded
}

/** Obfuscates numeric IDs reversibly; this is not cryptographic access control. */
export class ShortCodeCodec {
  private readonly multiplier: bigint
  private readonly inverseMultiplier: bigint
  private readonly offset: bigint

  constructor(secret: string) {
    if (secret.length < 32) {
      throw new Error('Invalid shortcode secret: expected at least 32 characters')
    }

    this.multiplier = deriveMultiplier(secret)
    this.inverseMultiplier = modularInverse(
      this.multiplier,
      SHORT_CODE_CAPACITY,
    )
    this.offset = secretNumber(secret, 'short-code-offset') % SHORT_CODE_CAPACITY
  }

  encode(id: bigint): string {
    if (id < 1n || id > SHORT_CODE_CAPACITY) {
      throw new Error(
        `Invalid URL ID ${id}: expected a value between 1 and ${SHORT_CODE_CAPACITY}`,
      )
    }

    const normalizedId = id - 1n
    const obfuscatedId = modulo(
      this.multiplier * normalizedId + this.offset,
      SHORT_CODE_CAPACITY,
    )

    return encodeBase62(obfuscatedId)
  }

  decode(shortCode: string): bigint {
    if (!/^[0-9A-Za-z]{4,6}$/.test(shortCode)) {
      throw new Error(
        `Invalid shortcode ${JSON.stringify(shortCode)}: expected 4 to 6 Base62 characters`,
      )
    }

    const obfuscatedId = decodeBase62(shortCode)

    if (obfuscatedId >= SHORT_CODE_CAPACITY) {
      throw new Error(`Invalid shortcode ${JSON.stringify(shortCode)}: outside the supported namespace`)
    }

    const normalizedId = modulo(
      this.inverseMultiplier * (obfuscatedId - this.offset),
      SHORT_CODE_CAPACITY,
    )
    const id = normalizedId + 1n

    if (this.encode(id) !== shortCode) {
      throw new Error(`Invalid shortcode ${JSON.stringify(shortCode)}: expected its canonical representation`)
    }

    return id
  }
}
