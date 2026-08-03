import { describe, expect, it } from 'vitest'
import { anonymizeIp } from './ip-identity'

const secret = 'test-rate-limit-secret-with-32-chars'

describe('anonymizeIp', () => {
  it('normalizes IPv4-mapped IPv6 to the same identity as IPv4', () => {
    expect(anonymizeIp('::ffff:192.0.2.10', secret)).toBe(
      anonymizeIp('192.0.2.10', secret),
    )
  })

  it('groups IPv6 clients by their 64-bit network prefix', () => {
    expect(
      anonymizeIp('2001:db8:abcd:1234:1111:2222:3333:4444', secret),
    ).toBe(
      anonymizeIp('2001:db8:abcd:1234:aaaa:bbbb:cccc:dddd', secret),
    )
    expect(
      anonymizeIp('2001:db8:abcd:1235::1', secret),
    ).not.toBe(anonymizeIp('2001:db8:abcd:1234::1', secret))
  })

  it('does not expose the normalized address in the identity', () => {
    const identity = anonymizeIp('203.0.113.42', secret)

    expect(identity).toMatch(/^[a-f0-9]{64}$/)
    expect(identity).not.toContain('203.0.113.42')
  })

  it('rejects an invalid client address', () => {
    expect(() => anonymizeIp('not-an-ip', secret)).toThrow(
      'Invalid client IP "not-an-ip"',
    )
  })
})
