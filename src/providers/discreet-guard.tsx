import { createContext, useContext, type ReactNode } from "react"
import { useSettings } from "@/hooks/use-settings"

interface DiscreetGuardContext {
  discreet: boolean
}

const DiscreetGuardContext = createContext<DiscreetGuardContext>({
  discreet: false,
})

export function DiscreetGuard({ children }: { children: ReactNode }) {
  const { discreetMode } = useSettings()
  return (
    <DiscreetGuardContext.Provider value={{ discreet: discreetMode }}>
      {children}
    </DiscreetGuardContext.Provider>
  )
}

export function useDiscreet(): boolean {
  return useContext(DiscreetGuardContext).discreet
}

export function discreetLabel(discreet: boolean, normal: string, masked: string): string {
  return discreet ? masked : normal
}
