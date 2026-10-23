export const orderTimerConfig = {
  warningMinutes: 10,
  criticalMinutes: 5,
} as const

export type PromiseTimerTone = 'normal' | 'warning' | 'critical' | 'overdue'

export type PromiseTimerState = {
  label: string
  tone: PromiseTimerTone
  totalSeconds: number
}

function promiseDateFromTime(promiseTime: string, now: Date) {
  const match = promiseTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  const promiseDate = new Date(now)
  promiseDate.setHours(hours, minutes, 0, 0)
  return promiseDate
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getPromiseTimerState(promiseTime: string, nowTimestamp: number): PromiseTimerState {
  const now = new Date(nowTimestamp)
  const promiseDate = promiseDateFromTime(promiseTime, now)
  if (!promiseDate) return { label: '--:--', tone: 'normal', totalSeconds: 0 }

  const differenceSeconds = Math.floor((promiseDate.getTime() - nowTimestamp) / 1000)
  if (differenceSeconds <= 0) {
    return { label: `Atrasado · ${formatDuration(Math.abs(differenceSeconds))}`, tone: 'overdue', totalSeconds: differenceSeconds }
  }

  const warningSeconds = orderTimerConfig.warningMinutes * 60
  const criticalSeconds = orderTimerConfig.criticalMinutes * 60
  const tone = differenceSeconds <= criticalSeconds ? 'critical' : differenceSeconds <= warningSeconds ? 'warning' : 'normal'
  return { label: formatDuration(differenceSeconds), tone, totalSeconds: differenceSeconds }
}
