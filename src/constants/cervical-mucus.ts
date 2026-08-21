export const CERVICAL_MUCUS_CATALOG = [
  { key: "dry", label: "Dry" },
  { key: "sticky", label: "Sticky" },
  { key: "creamy", label: "Creamy" },
  { key: "watery", label: "Watery" },
  { key: "egg-white", label: "Egg white" },
] as const

export type CervicalMucusKey = (typeof CERVICAL_MUCUS_CATALOG)[number]["key"]
