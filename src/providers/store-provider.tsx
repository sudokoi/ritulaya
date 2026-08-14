import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import { createActor } from "xstate"
import { settingsMachine } from "@/stores/settings-store"

interface StoreActors {
  settingsActor: ReturnType<typeof createActor<typeof settingsMachine>>
}

const StoreContext = createContext<StoreActors | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const actors = useMemo(
    () => ({
      settingsActor: createActor(settingsMachine),
    }),
    [],
  )

  useEffect(() => {
    actors.settingsActor.start()
    return () => {
      actors.settingsActor.stop()
    }
  }, [actors])

  return <StoreContext.Provider value={actors}>{children}</StoreContext.Provider>
}

export function useStoreActors() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("StoreProvider not found")
  return ctx
}
