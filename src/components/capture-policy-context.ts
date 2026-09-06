import { createContext, useContext } from "react"

export const CaptureReady = createContext(true)
export const useCaptureReady = () => useContext(CaptureReady)
