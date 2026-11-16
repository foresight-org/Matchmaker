import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { peekLiveSession, RECONCILE_SESSION_PATH } from "@/lib/auth/live-session"
import { getSession } from "@/lib/auth/session"
import { getT } from "@/lib/i18n/server"
import { magicLinkMode } from "@/lib/auth/mail"
import { SigninForm } from "@/components/signin-form"
import { MagicLinkNote } from "@/components/magic-link-note"
import { HereRoomPanel } from "@/components/onsite/here-room-panel"
import { MixerJoinForm } from "@/components/onsite/mixer-join-form"
import { MixerSelf } from "@/components/onsite/mixer-self"
import { hydrateEvents, hydrateListings } from "@/lib/db/durable"
import { listEvents } from "@/lib/db/events"
import { getProfilesByEmail } from "@/lib/db/profiles"
import { isOnsiteCitySlug, onsiteCity } from "@/lib/onsite/cities"
import { isCheckedIn } from "@/lib/onsite/presence"
import { mixerRole } from "@rmm/matching"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "I'm here",
  robots: { index: false, follow: false },
}

/**
 * Phone page behind the projector QR. Every path ends here: confirm email,
 * add a listing if needed, then join the room board automatically.
 */
export default async function HereCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: raw } = await params
  if (!isOnsiteCitySlug(raw)) notFound()

  const { t } = await getT()
  const next = `/here/${raw}`
  const live = await peekLiveSession()
  if (live?.needsReconcile) redirect(`${RECONCILE_SESSION_PATH}?next=${encodeURIComponent(next)}`)

  const session = live ? live.session : await getSession()
  const mixer = raw === "berkeley"

  if (session) await hydrateListings()
  const owned = session ? getProfilesByEmail(session.email) : []
  const mixerProfile = mixer ? (owned.find((profile) => profile.challenge_id === "vision_mixer") ?? null) : null
  const roomProfile = mixer ? mixerProfile : (live?.profile ?? null)

  let already = false
  if (roomProfile) {
    await hydrateEvents()
    already = isCheckedIn(listEvents(), raw, roomProfile.id)
  }

  const programme = onsiteCity(raw)?.challengeId ?? "recoding_medicine"
  const registerHref = `/register?challenge=${programme}&next=${encodeURIComponent(next)}`

  const mode = magicLinkMode()

  return (
    <div className="mx-auto max-w-md px-1 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal">
        {t(raw === "berkeley" ? "onsite.feed.kicker_berkeley" : "onsite.feed.kicker")}
      </p>
      <h1 className="mt-2 font-listing text-4xl uppercase leading-none tracking-tight sm:text-5xl">
        {t(mixer ? "onsite.feed.title_berkeley" : `onsite.city.${raw}`)}
      </h1>
      <p className="mt-2 text-sm uppercase tracking-widest text-ink-soft">
        {t(`onsite.date.${raw}`)}
        {mixer ? ` · ${t("onsite.feed.pitch_berkeley")}` : ""}
      </p>

      {!session ? (
        <>
          <p className="mt-8 text-lg leading-relaxed">
            {t(mixer ? "onsite.here.luma_lead" : "onsite.here.signin_lead")}
          </p>
          {mixer ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t("onsite.here.luma_body")}</p>
          ) : null}
          <MagicLinkNote mode={mode} className="mt-4" />
          <div className="mt-6">
            <SigninForm mode={mode} next={next} intent="here" copy={mixer ? "luma" : "default"} />
          </div>
        </>
      ) : mixer && !mixerProfile ? (
        owned.length === 0 ? (
          <>
            <p className="mt-8 text-lg leading-relaxed">{t("onsite.here.luma_missing_lead")}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t("onsite.here.luma_missing_body")}</p>
            <MixerJoinForm />
            <Link
              href={`/api/v1/auth/logout?next=${encodeURIComponent(next)}`}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center text-sm font-semibold uppercase tracking-wide underline underline-offset-4"
            >
              {t("onsite.here.luma_switch")}
            </Link>
          </>
        ) : (
          <HereRoomPanel
            city={raw}
            orgName={owned[0]!.org_name}
            hidden
            already
            join={false}
            note={`${t("onsite.join.other_lead")} ${t("onsite.join.other_body")}`}
          />
        )
      ) : !live && !mixerProfile ? (
          <>
            <p className="mt-8 text-lg leading-relaxed">{t("onsite.here.create_lead")}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t("onsite.here.create_body")}</p>
            <Link
              href={registerHref}
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center border border-ink bg-mark px-6 text-base font-semibold uppercase tracking-wide text-mark-ink hover:bg-ink hover:text-paper"
            >
              {t("onsite.here.cta_create")}
            </Link>
          </>
      ) : mixer && mixerProfile ? (
        <HereRoomPanel
          city={raw}
          orgName={mixerProfile.org_name}
          hidden={mixerProfile.visibility === "hidden"}
          already={already}
          self={
            <MixerSelf
              name={mixerProfile.org_name}
              line={mixerProfile.one_liner}
              role={mixerRole(mixerProfile.contact_role ?? "")}
              hidden={mixerProfile.visibility === "hidden"}
            />
          }
        />
      ) : live ? (
        <HereRoomPanel
          city={raw}
          orgName={live.profile.org_name}
          hidden={live.profile.visibility === "hidden"}
          already={already}
        />
      ) : null}
    </div>
  )
}
