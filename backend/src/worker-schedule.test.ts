import { describe, expect, it } from 'vitest'
import { hoursToMilliseconds } from './worker-schedule'

describe('hoursToMilliseconds', () => {
  it('schedules daily maintenance every 24 hours', () => {
    expect(hoursToMilliseconds(24)).toBe(86_400_000)
  })
})
