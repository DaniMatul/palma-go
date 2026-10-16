import { useEffect, useState } from 'react'

export function useCurrentDateTime() {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentDate(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return {
    time: currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    date: `${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][currentDate.getDay()]}, ${currentDate.getDate()} ${currentDate.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '')}`,
  }
}
