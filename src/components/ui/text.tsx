import { Text as NativeText, type TextProps } from "react-native"
import { cn } from "@/lib/utils"

const roles = {
  screen: "text-screen-title",
  cycle: "text-cycle-number",
  date: "text-prominent-date",
  section: "text-section-title",
  body: "text-body",
  label: "text-label",
  supporting: "text-supporting",
} as const

const tones = {
  primary: "text-[var(--text-primary)]",
  muted: "text-[var(--text-muted)]",
  accent: "text-[var(--accent)]",
  danger: "text-[var(--danger)]",
  onAccent: "text-[var(--on-accent)]",
} as const

interface AppTextProps extends TextProps {
  variant?: keyof typeof roles
  tone?: keyof typeof tones
}

export function AppText({
  variant = "body",
  tone = "primary",
  className,
  ...props
}: AppTextProps) {
  return <NativeText {...props} className={cn(roles[variant], tones[tone], className)} />
}
