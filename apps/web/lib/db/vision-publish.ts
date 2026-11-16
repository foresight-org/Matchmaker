/**
 * Copy the local Founder & Funder roster into Supabase.
 *
 * Pass the pulled production env file. Only the Supabase URL and service
 * role are read from it — never Blob, and never a DATABASE_PATH that would
 * point this process at an empty cache. Nothing from that file is printed.
 *
 *   pnpm --filter @rmm/web exec tsx lib/db/vision-publish.ts /abs/.env.production.local
 */
import { existsSync, readFileSync } from "node:fs"

const CITY = "berkeley"
const BATCH = 8

function loadSupabase(file: string): void {
  const text = readFileSync(file, "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    const key = trimmed.slice(0, eq)
    if (key !== "SUPABASE_URL" && key !== "SUPABASE_SERVICE_ROLE_KEY") continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
  process.env.DURABLE_PROFILES = "1"
  delete process.env.BLOB_READ_WRITE_TOKEN
  delete process.env.DATABASE_PATH
}

const envFile = process.argv[2]
if (!envFile || !existsSync(envFile)) {
  console.error("Pass the pulled production env file. It is not printed.")
  process.exit(1)
}
loadSupabase(envFile)

async function main(): Promise<void> {
  const { persistEvent, persistListing } = await import("./durable")
  const { durableEnabled } = await import("./durable-store")
  const { listEvents } = await import("./events")
  const { listProfiles } = await import("./profiles")

  if (!durableEnabled()) {
    console.error("Supabase credentials were not in that file.")
    process.exit(1)
  }

  const profiles = listProfiles().filter((profile) => profile.challenge_id === "vision_mixer")
  const checkins = listEvents().flatMap((event) => {
    if (event.type !== "onsite_checkin" || event.payload.city !== CITY || !event.actorId || !event.uid) {
      return []
    }
    return [
      {
        uid: event.uid,
        type: event.type,
        actorId: event.actorId,
        payload: event.payload,
        createdAt: event.createdAt,
      },
    ]
  })

  if (profiles.length === 0 || checkins.length === 0) {
    console.error("Local Berkeley board is empty. Run vision-fill first.")
    process.exit(1)
  }

  async function inBatches<T>(rows: readonly T[], run: (row: T) => Promise<void>): Promise<number> {
    let failed = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH)
      const results = await Promise.all(
        slice.map(async (row) => {
          try {
            await run(row)
            return true
          } catch (error) {
            failed += 1
            console.error("[vision-publish] write failed", error instanceof Error ? error.message : "error")
            return false
          }
        }),
      )
      console.log(`${i + results.length}/${rows.length}`)
    }
    return failed
  }

  const listingFailures = await inBatches(profiles, (profile) => persistListing(profile))
  const eventFailures = await inBatches(checkins, (event) => persistEvent(event))

  console.log(
    `Published ${profiles.length - listingFailures} listings and ${checkins.length - eventFailures} Berkeley check-ins.`,
  )

  if (listingFailures > 0 || eventFailures > 0) process.exit(1)
}

void main()
