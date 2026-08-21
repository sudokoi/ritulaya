import { useMemo } from "react"
import { useSelector } from "@xstate/store-react"
import { predictionStore } from "@/stores/prediction-store"
import { dayLogStore } from "@/stores/day-log-store"
import {
  deriveCycleDays,
  fertileFractions,
  type FertileDay,
} from "@/lib/cycle-derivation"

/**
 * The single visual state of one calendar day, derived once and shared by
 * every surface that renders days (Today strip, month grid).
 */
export interface CycleDayState {
  period: boolean
  predicted: boolean
  uncertain: boolean
  fertile: number
  ovulation: boolean
  logged: boolean
}

const EMPTY_STATE: CycleDayState = {
  period: false,
  predicted: false,
  uncertain: false,
  fertile: 0,
  ovulation: false,
  logged: false,
}

function buildDayStates(
  prediction: ReturnType<typeof predictionStore.getSnapshot>["context"]["prediction"],
  avgCycleLength: number,
  logs: { date: string; flowIntensity: string | null }[],
  throughDate?: Date,
): Map<string, CycleDayState> {
  const flowDays = logs
    .filter((log) => log.flowIntensity && log.flowIntensity !== "none")
    .map((log) => log.date)
  const loggedDays = logs.map((log) => log.date)

  const { periodDays, predictedDays, uncertainDays, fertileDays, ovulationDays } =
    deriveCycleDays(prediction, flowDays, { avgCycleLength, throughDate })

  const states = new Map<string, CycleDayState>()
  const touch = (iso: string) => {
    let state = states.get(iso)
    if (!state) {
      state = { ...EMPTY_STATE }
      states.set(iso, state)
    }
    return state
  }

  const fertileMap = fertileFractions(fertileDays as FertileDay[])
  for (const iso of periodDays) touch(iso).period = true
  for (const iso of predictedDays) touch(iso).predicted = true
  for (const iso of uncertainDays) touch(iso).uncertain = true
  for (const iso of ovulationDays) touch(iso).ovulation = true
  for (const iso of loggedDays) touch(iso).logged = true
  for (const [iso, fraction] of fertileMap) touch(iso).fertile = fraction

  return states
}

export function useCycleDayStates(throughDate?: Date) {
  const prediction = useSelector(predictionStore, (s) => s.context.prediction)
  const avgCycleLength = useSelector(predictionStore, (s) => s.context.avgCycleLength)
  const logs = useSelector(dayLogStore, (s) => s.context.logs)

  return useMemo(
    () => buildDayStates(prediction, avgCycleLength, logs, throughDate),
    [prediction, avgCycleLength, logs, throughDate],
  )
}
