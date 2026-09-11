import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { addDays, startOfDay } from "date-fns"

/** Refresh date-dependent controls at local midnight and after backgrounding. */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const now = new Date()
      const day = startOfDay(now)
      setToday((previous) => (previous.getTime() === day.getTime() ? previous : day))
      timer = setTimeout(refresh, addDays(day, 1).getTime() - now.getTime())
    }
    refresh()
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh()
    })
    return () => {
      clearTimeout(timer)
      subscription.remove()
    }
  }, [])
  return today
}
