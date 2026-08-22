import { createStore } from "@xstate/store"
import { initiateDeviceFlow, pollForToken } from "@/services/sync"
import { logger } from "@/services/logger"

export interface DeviceFlowState {
  userCode: string
  verificationUrl: string
}

interface AuthState {
  deviceFlow: DeviceFlowState | null
  connecting: boolean
  error: string | null
}

const initialState: AuthState = {
  deviceFlow: null,
  connecting: false,
  error: null,
}

export const authStore = createStore({
  context: initialState,
  on: {
    setDeviceFlow: (ctx, event: { deviceFlow: DeviceFlowState | null }) => ({
      ...ctx,
      deviceFlow: event.deviceFlow,
    }),
    setConnecting: (ctx, event: { connecting: boolean }) => ({
      ...ctx,
      connecting: event.connecting,
    }),
    setError: (ctx, event: { error: string | null }) => ({
      ...ctx,
      error: event.error,
    }),
    reset: () => ({ ...initialState }),
  },
})

export async function connectDeviceFlow(isCancelled: () => boolean): Promise<boolean> {
  authStore.send({ type: "setError", error: null })
  authStore.send({ type: "setConnecting", connecting: true })
  try {
    const flow = await initiateDeviceFlow()
    authStore.send({ type: "setDeviceFlow", deviceFlow: flow })
    const granted = await pollForToken(isCancelled)
    authStore.send({ type: "setDeviceFlow", deviceFlow: null })
    if (!granted) {
      if (!isCancelled()) {
        authStore.send({
          type: "setError",
          error: "Authorization timed out. Please try again.",
        })
      }
      return false
    }
    return true
  } catch (e) {
    authStore.send({ type: "setDeviceFlow", deviceFlow: null })
    authStore.send({
      type: "setError",
      error: e instanceof Error ? e.message : "Failed to connect to GitHub",
    })
    logger.error("sync:device-flow", "GitHub device flow failed", e)
    return false
  } finally {
    authStore.send({ type: "setConnecting", connecting: false })
  }
}
