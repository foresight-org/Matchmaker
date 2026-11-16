import { NextRequest } from "next/server"
import { ZodError } from "zod"
import { mixerCardSchema } from "@/lib/api/input"
import { ok, zodError, badRequest, unauthorized, unavailable } from "@/lib/api/respond"
import { getSession } from "@/lib/auth/session"
import { persistListing, PERSIST_UNAVAILABLE_MESSAGE, ensureOwnedListing } from "@/lib/db/durable"
import { getProfilesByEmail, saveProfile } from "@/lib/db/profiles"
import { MIXER_ROLE_LINE } from "@/lib/onsite/vision-profile"
import { mixerRole } from "@rmm/matching"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/onsite/card — edit the card the mixer room sees.
 * Name, role, one line, or hidden. The rest of the listing stays put.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest("Request body must be JSON.")
  }

  let input
  try {
    input = mixerCardSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) return zodError(e)
    throw e
  }

  await ensureOwnedListing(session.profileId, session.email)
  const profile = getProfilesByEmail(session.email).find((row) => row.challenge_id === "vision_mixer")
  if (!profile) return badRequest("No Founder & Funder Mixer profile for this email.")

  const name = input.name?.trim() || profile.org_name
  const line = input.line?.trim() || profile.one_liner
  const updated = saveProfile({
    ...profile,
    org_name: name,
    contact_name: name,
    one_liner: line,
    summary: input.line?.trim() ? line : profile.summary,
    contact_role: input.role ? MIXER_ROLE_LINE[input.role] : profile.contact_role,
    visibility: input.hidden === undefined ? profile.visibility : input.hidden ? "hidden" : "authenticated_only",
  })

  try {
    await persistListing(updated)
  } catch (error) {
    console.error("[durable] persist mixer card failed", { id: updated.id }, error)
    return unavailable(PERSIST_UNAVAILABLE_MESSAGE)
  }

  return ok({
    hidden: updated.visibility === "hidden",
    name: updated.org_name,
    line: updated.one_liner,
    role: mixerRole(updated.contact_role ?? ""),
  })
}
