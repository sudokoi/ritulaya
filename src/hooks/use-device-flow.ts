import { useCallback, useEffect, useRef, useState } from "react"
import { initiateDeviceFlow, pollForToken } from "@/services/sync"
import { logger } from "@/services/logger"

export function useDeviceFlow() {
  const [deviceFlow, setDeviceFlow] = useState<{
    userCode: string
    verificationUrl: string
  } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const connect = useCallback(async (): Promise<boolean> => {
    setError(null)
    setConnecting(true)
    try {
      const flow = await initiateDeviceFlow()
      setDeviceFlow(flow)

      const token = await pollForToken(() => cancelledRef.current)
      setDeviceFlow(null)

      if (!token) {
        if (!cancelledRef.current) {
          setError("Authorization timed out. Please try again.")
        }
        return false
      }
      return true
    } catch (e) {
      setDeviceFlow(null)
      setError(e instanceof Error ? e.message : "Failed to connect to GitHub")
      logger.error("sync:device-flow", "GitHub device flow failed", e)
      return false
    } finally {
      setConnecting(false)
    }
  }, [])

  return { deviceFlow, connecting, error, connect }
}
