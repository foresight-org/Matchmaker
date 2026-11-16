import type { Profile } from "@rmm/schema"
import type { EventRow } from "@/lib/db/events"
import type { T } from "@/lib/i18n"
import { type OnsiteCitySlug, onsiteCity } from "./cities"
import { checkInsForCity, presentCards } from "./presence"
import { pickSpotlight } from "./spotlight"
import type { OnsiteFeed } from "./types"

export function buildOnsiteFeed(
  city: OnsiteCitySlug,
  profiles: readonly Profile[],
  events: readonly EventRow[],
  t: T,
  nowMs = Date.now(),
): OnsiteFeed {
  const def = onsiteCity(city)
  if (!def) {
    return {
      city,
      city_label: city,
      date_label: "",
      count: 0,
      people: [],
      spotlight: null,
    }
  }
  const checkIns = checkInsForCity(events, city)
  // Berkeley is the mixer. An older programme listing must not appear on that wall.
  const roster = city === "berkeley" ? profiles.filter((profile) => profile.challenge_id === "vision_mixer") : profiles
  const people = presentCards(roster, checkIns, t)
  return {
    city,
    city_label: t(`onsite.city.${city}`),
    date_label: t(`onsite.date.${city}`),
    count: people.length,
    people,
    spotlight: pickSpotlight(people, profiles, nowMs),
  }
}
