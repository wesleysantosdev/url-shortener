import { createHmac } from 'node:crypto'
import ipaddr from 'ipaddr.js'

function normalizeIp(ip: string): string {
  if (!ipaddr.isValid(ip)) {
    throw new Error(
      `Invalid client IP ${JSON.stringify(ip)}: expected IPv4 or IPv6`,
    )
  }

  const parsedAddress = ipaddr.parse(ip)

  if (parsedAddress.kind() === 'ipv4') {
    return parsedAddress.toString()
  }

  const ipv6Address = parsedAddress as ipaddr.IPv6

  if (ipv6Address.isIPv4MappedAddress()) {
    return ipv6Address.toIPv4Address().toString()
  }

  const networkParts = ipv6Address.parts.slice(0, 4)
  return `${networkParts.map((part) => part.toString(16)).join(':')}::/64`
}

/** Produces a non-reversible rate-limit identity from a normalized client IP. */
export function anonymizeIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(normalizeIp(ip)).digest('hex')
}
