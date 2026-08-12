export function sanitizeLog(log: string): string {
  return log
    .replace(/\d{4}-\d{2}-\d{2}/g, "[DATE]")
    .replace(/\bstartDate\b/g, "[FIELD]")
    .replace(/\bendDate\b/g, "[FIELD]")
    .replace(/"[^"]*cramps[^"]*"/gi, '"[REDACTED]"')
    .replace(/"[^"]*symptoms[^"]*"/gi, '"[REDACTED]"')
    .replace(/"[^"]*mood[^"]*"/gi, '"[REDACTED]"')
    .replace(/"[^"]*notes[^"]*"/gi, '"[REDACTED]"')
}
