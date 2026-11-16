import { NextResponse } from "next/server"
import { listDirectoryProfiles } from "@/lib/db/profiles"
import { hydrateListings } from "@/lib/db/durable"
import { getSession } from "@/lib/auth/session"
import { unauthorized } from "@/lib/api/respond"
import { listingOnDisplay } from "@/lib/challenges/catalog"

/**
 * GET /api/v1/directory.json — members-only machine-readable listings.
 * Same corpus as `/api/v1/directory`. Contact details are never included.
 */
export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) return unauthorized("Sign in to browse the directory.")

  await hydrateListings()

  return NextResponse.json(
    {
      version: "v1",
      generated_at: new Date().toISOString(),
      profiles: listDirectoryProfiles({ includeAuthenticatedOnly: true }).filter((profile) => {
        const id = typeof profile.id === "string" ? profile.id : ""
        const challengeId = typeof profile.challenge_id === "string" ? profile.challenge_id : null
        return listingOnDisplay(challengeId, id !== "" && id === session.profileId)
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
