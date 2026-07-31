import autocannon from 'autocannon'

function positiveInteger(name: string, defaultValue: number): number {
  const rawValue = process.env[name]

  if (rawValue === undefined) {
    return defaultValue
  }

  const value = Number(rawValue)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}

const targetUrl = process.env.BENCHMARK_TARGET_URL

if (!targetUrl) {
  throw new Error(
    'BENCHMARK_TARGET_URL is required, for example http://localhost:5000/100680ad546ce6a5',
  )
}

const connections = positiveInteger('BENCHMARK_CONNECTIONS', 50)
const duration = positiveInteger('BENCHMARK_DURATION_SECONDS', 15)

console.log({
  message: 'Starting redirect benchmark',
  targetUrl,
  connections,
  durationSeconds: duration,
})

autocannon(
  {
    url: targetUrl,
    connections,
    duration,
    method: 'GET',
    pipelining: 1,
  },
  (error, result) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
      return
    }

    console.log(autocannon.printResult(result))
  },
)
