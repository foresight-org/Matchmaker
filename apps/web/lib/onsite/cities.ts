import { RECODING_MATCHMAKING_EVENT_URLS, type ChallengeId } from "@/lib/challenges/catalog"

/**
 * In-person Recoding Medicine rooms. Slugs are the public URL segment
 * (`/live-feed/berlin`, `/here/berlin`) so printed QR codes stay stable
 * if we ever rename the attending chip.
 */

export const ONSITE_CITY_SLUGS = ["berlin", "paris", "stockholm", "berkeley"] as const
export type OnsiteCitySlug = (typeof ONSITE_CITY_SLUGS)[number]

export interface OnsiteCity {
  slug: OnsiteCitySlug
  attending: "event_sept_1" | "event_sept_2" | "event_sept_3" | "vw_mixer"
  /** Civil date the room is named for, YYYY-MM-DD. */
  date: string
  luma: string
  /** Programme the phone QR should offer if someone still needs a listing. */
  challengeId: ChallengeId
}

export const ONSITE_CITIES: readonly OnsiteCity[] = [
  {
    slug: "berlin",
    attending: "event_sept_1",
    date: "2026-09-02",
    luma: RECODING_MATCHMAKING_EVENT_URLS.event_sept_1,
    challengeId: "recoding_medicine",
  },
  {
    slug: "paris",
    attending: "event_sept_2",
    date: "2026-09-09",
    luma: RECODING_MATCHMAKING_EVENT_URLS.event_sept_2,
    challengeId: "recoding_medicine",
  },
  {
    slug: "stockholm",
    attending: "event_sept_3",
    date: "2026-09-17",
    luma: RECODING_MATCHMAKING_EVENT_URLS.event_sept_3,
    challengeId: "recoding_medicine",
  },
  {
    slug: "berkeley",
    attending: "vw_mixer",
    date: "2026-11-15",
    luma: "https://luma.com/foresight-vq9z",
    challengeId: "vision_mixer",
  },
]

export function isOnsiteCitySlug(value: string | undefined | null): value is OnsiteCitySlug {
  return ONSITE_CITY_SLUGS.includes(value as OnsiteCitySlug)
}

export function onsiteCity(slug: string | undefined | null): OnsiteCity | undefined {
  if (!isOnsiteCitySlug(slug)) return undefined
  return ONSITE_CITIES.find((city) => city.slug === slug)
}

/** YYYY-MM-DD in a civil timezone. */
export function civilDateIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** YYYY-MM-DD in Europe/Berlin — the Recoding Medicine rooms are CET/CEST, not UTC. */
export function civilDateInBerlin(now = new Date()): string {
  return civilDateIn("Europe/Berlin", now)
}

/**
 * Which room the projector should open. Before Paris's date we stay on
 * Berlin (including the day-before rehearsal). After Stockholm's date we
 * stay on Stockholm so the URL does not go blank.
 */
export function liveFeedCity(now = new Date()): OnsiteCitySlug {
  // Sunday evening in Berkeley is already Monday morning in Berlin, so the
  // mixer window is a Pacific civil date, not the CET date the other rooms use.
  const bay = civilDateIn("America/Los_Angeles", now)
  if (bay === "2026-11-15" || bay === "2026-11-16") return "berkeley"

  const today = civilDateInBerlin(now)
  if (today < ONSITE_CITIES[1]!.date) return "berlin"
  if (today < ONSITE_CITIES[2]!.date) return "paris"
  return "stockholm"
}
