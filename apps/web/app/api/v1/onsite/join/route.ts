import { NextRequest } from "next/server"
import { ZodError } from "zod"
import { mixerJoinSchema } from "@/lib/api/input"
import { ok, zodError, badRequest, unauthorized, unavailable } from "@/lib/api/respond"
import { createSession, getSession } from "@/lib/auth/session"
import { ensureOwnedListing, hydrateEvents, persistListing, PERSIST_UNAVAILABLE_MESSAGE } from "@/lib/db/durable"
import { flushEvent, listEvents, logEvent } from "@/lib/db/events"
import { getProfilesByEmail, markClaimed, saveProfile } from "@/lib/db/profiles"
import { isCheckedIn } from "@/lib/onsite/presence"
import { mixerWalkUpInput } from "@/lib/onsite/vision-profile"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/onsite/join — a short card for someone not already on the
 * mixer list, then check them into Berkeley.
 *
 * One email still owns one listing. An older programme is left alone, and
 * this route will not put that listing on the mixer wall.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized("Confirm your email before adding a profile.")

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest("Request body must be JSON.")
  }

  let input
  try {
    input = mixerJoinSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) return zodError(e)
    throw e
  }

  await ensureOwnedListing(session.profileId, session.email)
  const existing = getProfilesByEmail(session.email)
  const mixer = existing.find((profile) => profile.challenge_id === "vision_mixer")
  if (!mixer && existing.length > 0) {
    return ok({ joined: false, reason: "other_programme" })
  }

  let profile = mixer
  if (!profile) {
    try {
      profile = saveProfile(mixerWalkUpInput({ ...input, email: session.email }), { isNew: true })
    } catch (e) {
      if (e instanceof ZodError) return zodError(e)
      throw e
    }
    markClaimed(profile.id)
    try {
      await persistListing(profile)
    } catch (error) {
      console.error("[durable] persist mixer join failed", { id: profile.id }, error)
      const res = unavailable(PERSIST_UNAVAILABLE_MESSAGE)
      await createSession(profile.id, session.email, res.cookies)
      return res
    }
  }

  await hydrateEvents()
  let recorded = false
  if (!isCheckedIn(listEvents(), "berkeley", profile.id)) {
    const event = logEvent("onsite_checkin", profile.id, {
      city: "berkeley",
      attending: profile.attending,
    })
    await flushEvent(event)
    recorded = true
  }

  const res = ok({ joined: true, recorded, profile_id: profile.id }, { status: mixer ? 200 : 201 })
  await createSession(profile.id, session.email, res.cookies)
  return res
}
