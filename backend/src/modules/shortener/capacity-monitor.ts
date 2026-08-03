interface CapacityWarning {
  message: string
  thresholdPercent: number
  activeCount: number
  maximumActiveUrls: number
}

type Warn = (warning: CapacityWarning) => void

export class CapacityMonitor {
  private readonly notifiedThresholds = new Set<number>()

  constructor(private readonly warn: Warn = console.warn) {}

  observe(activeCount: number, maximumActiveUrls: number): void {
    const usagePercent = (activeCount / maximumActiveUrls) * 100

    for (const thresholdPercent of [80, 90]) {
      if (usagePercent < thresholdPercent) {
        this.notifiedThresholds.delete(thresholdPercent)
        continue
      }

      if (this.notifiedThresholds.has(thresholdPercent)) {
        continue
      }

      this.notifiedThresholds.add(thresholdPercent)
      this.warn({
        message: 'URL capacity threshold reached',
        thresholdPercent,
        activeCount,
        maximumActiveUrls,
      })
    }
  }
}

export const capacityMonitor = new CapacityMonitor()
