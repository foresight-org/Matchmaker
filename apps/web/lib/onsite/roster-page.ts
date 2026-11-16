/**
 * Two columns of eight. Wide enough for a name and two lines of the project,
 * few enough that a room can actually read the page before it turns.
 */
export const ROSTER_PAGE_SIZE = 16

/** Long enough to find a surname and read the line under it. */
export const ROSTER_PAGE_MS = 20_000

export function rosterWindow(count: number, nowMs: number = Date.now()): {
  start: number
  end: number
  pages: number
} {
  if (count <= 0) return { start: 0, end: 0, pages: 1 }
  const pages = Math.max(1, Math.ceil(count / ROSTER_PAGE_SIZE))
  const page = Math.floor(nowMs / ROSTER_PAGE_MS) % pages
  const start = page * ROSTER_PAGE_SIZE
  return { start, end: Math.min(count, start + ROSTER_PAGE_SIZE), pages }
}

/** How much of the current page is still left, 1 at the start and 0 as it turns. */
export function rosterRemaining(nowMs: number = Date.now()): number {
  return 1 - (nowMs % ROSTER_PAGE_MS) / ROSTER_PAGE_MS
}

/** Surname, then the full name, so "Jean-Charles Cabelguen" sits with the Cs. */
export function surnameKey(name: string): string {
  const plain = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
  const parts = plain.split(/\s+/).filter(Boolean)
  const last = parts[parts.length - 1] ?? plain
  return `${last} ${plain}`
}

export function bySurname<T extends { org_name: string }>(a: T, b: T): number {
  return surnameKey(a.org_name).localeCompare(surnameKey(b.org_name))
}

/** First letter of the surname, after accents are stripped. */
export function surnameInitial(name: string): string {
  const ch = surnameKey(name).charAt(0).toUpperCase()
  return /[A-Z]/.test(ch) ? ch : "#"
}

/**
 * The letter range of a page that is already in surname order.
 * One letter stays a single letter so "M" is not written "M–M".
 */
export function letterSpan(names: readonly string[]): string {
  if (names.length === 0) return ""
  const first = surnameInitial(names[0] ?? "")
  const last = surnameInitial(names[names.length - 1] ?? "")
  return first === last ? first : `${first}–${last}`
}
