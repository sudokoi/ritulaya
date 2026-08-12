import { useSelector } from "@xstate/react"
import { useStoreActors } from "@/providers/store-provider"

export function useSettingsActor() {
  const { settingsActor } = useStoreActors()

  const ctx = useSelector(settingsActor, (s) => s.context)
  const isReady = useSelector(settingsActor, (s) => s.matches("ready"))

  return {
    ...ctx,
    isReady,
    load: () => settingsActor.send({ type: "load" }),
    update: (data: Partial<typeof ctx>) => settingsActor.send({ type: "update", data }),
  }
}
