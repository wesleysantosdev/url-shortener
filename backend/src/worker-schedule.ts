/** Converts a positive hour interval to its timer delay. */
export function hoursToMilliseconds(hours: number): number {
  return hours * 60 * 60 * 1_000
}
