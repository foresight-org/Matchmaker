import { NextRequest } from "next/server"
import { ZodError } from "zod"
import { onsiteCheckInSchema } from "@/lib/api/input"
import { ok, zodError, badRequest, unauthorized } from "@/lib/api/respond"
import { resolveLiveSession } from "@/lib/auth/live-session"
import { createSession, getSession } from "@/lib/auth/session"
import { hydrateEvents, hydrateListings } from "@/lib/db/durable"
import { flushEvent, listEvents, logEvent } from "@/lib/db/events"
import { getProfilesByEmail } from "@/lib/db/profiles"
import { isCheckedIn } from "@/lib/onsite/presence"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/onsite/check-in — “I’m here” for one city.
 * A listing is required. Hidden listings still record presence so staff
 * can see they arrived; the projector omits them.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const live = await resolveLiveSession()
  if (!live) {
    const session = await getSession()
    if (!session) return unauthorized()
    return badRequest("Add a profile before checking in.")
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest("Request body must be JSON.")
  }

  let input
  try {
    input = onsiteCheckInSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) return zodError(e)
    throw e
  }

  await Promise.all([hydrateListings(), hydrateEvents()])

  // The mixer wall is only Founder & Funder Mixer listings. An older
  // programme on the same email must not be checked into Berkeley.
  let profile = live.profile
  if (input.city === "berkeley") {
    const mixer = getProfilesByEmail(live.session.email).find((row) => row.challenge_id === "vision_mixer")
    if (!mixer) return badRequest("Add a Founder & Funder Mixer profile before checking in.")
    profile = mixer
  }

  if (isCheckedIn(listEvents(), input.city, profile.id)) {
    const res = ok({ recorded: false, already: true, hidden: profile.visibility === "hidden" })
    if (live.session.profileId !== profile.id) await createSession(profile.id, live.session.email, res.cookies)
    return res
  }

  const event = logEvent("onsite_checkin", profile.id, {
    city: input.city,
    attending: profile.attending,
  })
  await flushEvent(event)
  const res = ok(
    { recorded: true, already: false, hidden: profile.visibility === "hidden" },
    { status: 201 },
  )
  if (live.session.profileId !== profile.id) await createSession(profile.id, live.session.email, res.cookies)
  return res
}
