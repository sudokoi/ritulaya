import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import tokens from "@/constants/theme-tokens.json"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: Object.keys(tokens.typography) }],
      "min-h": [{ "min-h": ["touch"] }],
      "min-w": [{ "min-w": ["touch"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
