import { describe, expect, it, vi } from 'vitest'
import { CapacityMonitor } from './capacity-monitor'

describe('CapacityMonitor', () => {
  it('warns once when usage crosses 80% and 90%', () => {
    const warn = vi.fn()
    const monitor = new CapacityMonitor(warn)

    monitor.observe(79, 100)
    monitor.observe(80, 100)
    monitor.observe(85, 100)
    monitor.observe(90, 100)
    monitor.observe(95, 100)

    expect(warn).toHaveBeenNthCalledWith(1, {
      message: 'URL capacity threshold reached',
      thresholdPercent: 80,
      activeCount: 80,
      maximumActiveUrls: 100,
    })
    expect(warn).toHaveBeenNthCalledWith(2, {
      message: 'URL capacity threshold reached',
      thresholdPercent: 90,
      activeCount: 90,
      maximumActiveUrls: 100,
    })
  })

  it('allows thresholds to warn again after usage falls below them', () => {
    const warn = vi.fn()
    const monitor = new CapacityMonitor(warn)

    monitor.observe(90, 100)
    monitor.observe(70, 100)
    monitor.observe(80, 100)

    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenLastCalledWith(
      expect.objectContaining({ thresholdPercent: 80 }),
    )
  })
})
