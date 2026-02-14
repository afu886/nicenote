import { useEffect, useState } from 'react'

export function useMinuteTicker(intervalMs = 60000) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((value) => value + 1)
    }, intervalMs)

    return () => {
      clearInterval(timer)
    }
  }, [intervalMs])
}
