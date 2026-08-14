export function discreetLabel(discreet: boolean, normal: string, masked: string): string {
  return discreet ? masked : normal
}
