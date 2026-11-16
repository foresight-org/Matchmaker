"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useT } from "@/lib/i18n/client"
import { ForesightMark } from "@/components/foresight-mark"
import { LiveFeedCountdown } from "@/components/onsite/live-feed-countdown"
import { LiveFeedPair } from "@/components/onsite/live-feed-pair"
import { LiveFeedPersonCard } from "@/components/onsite/live-feed-person-card"
import { LiveFeedQrRail } from "@/components/onsite/live-feed-qr-rail"
import { MixerRoster } from "@/components/onsite/mixer-roster"
import { TrackLegend } from "@/components/onsite/track-legend"
import type { OnsiteCitySlug } from "@/lib/onsite/cities"
import { KIND_LEGEND, KIND_SKIN } from "@/lib/onsite/kind-skin"
import { isSparseRoom, roomShape } from "@/lib/onsite/room-shape"
import type { OnsiteFeed } from "@/lib/onsite/types"

const POLL_MS = 12_000

/** Keep anyone already on the wall if a sibling isolate returns a stale set. */
function mergeFeed(prev: OnsiteFeed, next: OnsiteFeed): OnsiteFeed {
  if (prev.people.length === 0) return next
  const byId = new Map(prev.people.map((person) => [person.id, person]))
  for (const person of next.people) byId.set(person.id, person)
  if (byId.size === next.people.length) return next

  const people = [...byId.values()].sort((a, b) =>
    a.arrived_at > b.arrived_at
      ? 1
      : a.arrived_at < b.arrived_at
        ? -1
        : a.org_name.localeCompare(b.org_name),
  )
  return { ...next, people, count: people.length }
}

/** Miniature cards, so the legend reads as the same object as the wall. */
function KindKey({ t, city }: { t: (key: string) => string; city: OnsiteCitySlug }) {
  const items =
    city === "berkeley"
      ? [
          { key: "individual" as const, label: t("enum.mixer_role.founder") },
          { key: "ai_team" as const, label: t("enum.mixer_role.funder") },
        ]
      : KIND_LEGEND.map((key) => ({ key, label: t(`enum.kind.${key}`) }))
  return (
    <ul className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span className={`h-3.5 w-6 border border-ink border-l-4 ${KIND_SKIN[item.key]}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

function RoomWall({
  people,
  lookingForLabel,
  profileOrigin,
  profileQrLabel,
  sparse,
  profileQr = true,
  namesOnly = false,
}: {
  people: OnsiteFeed["people"]
  lookingForLabel: string
  profileOrigin: string
  profileQrLabel: string
  sparse?: boolean
  /** A packed mixer wall cannot spare a QR on every name. The rail QR stays. */
  profileQr?: boolean
  /** Give the name the whole tile once the room no longer fits a footer. */
  namesOnly?: boolean
}) {
  const { cols, rows } = roomShape(people.length)
  const tone = sparse && people.length <= 2 ? "pair" : "tile"
  return (
    <ul
      className={
        sparse
          ? "mx-auto grid w-max max-w-full gap-3"
          : "grid h-full min-h-0 min-w-0 gap-2"
      }
      style={
        sparse
          ? {
              gridTemplateColumns: `repeat(${cols}, minmax(11rem, 18rem))`,
              gridTemplateRows: `repeat(${rows}, 12.5rem)`,
            }
          : {
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }
      }
    >
      {people.map((person) => (
        <li key={person.id} className="min-h-0 min-w-0">
          <LiveFeedPersonCard
            {...person}
            tone={tone}
            lookingForLabel={namesOnly ? undefined : lookingForLabel}
            profileOrigin={profileQr ? profileOrigin : undefined}
            profileQrLabel={profileQr ? profileQrLabel : undefined}
            nameLine={namesOnly ? "single" : "wrap"}
          />
        </li>
      ))}
    </ul>
  )
}

function GatheringRoom({
  people,
  spotlight,
  title,
  gathering,
  lookingForLabel,
  profileOrigin,
  profileQrLabel,
  rotateLabel,
  onRotate,
}: {
  people: OnsiteFeed["people"]
  spotlight: OnsiteFeed["spotlight"]
  title: string
  gathering: string
  lookingForLabel: string
  profileOrigin: string
  profileQrLabel: string
  rotateLabel: (seconds: number) => string
  onRotate: () => void
}) {
  const rest = people.filter(
    (person) => person.id !== spotlight?.left.id && person.id !== spotlight?.right.id,
  )
  const wall = spotlight ? rest : people

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-7">
      {spotlight ? (
        <LiveFeedPair
          compact
          left={spotlight.left}
          right={spotlight.right}
          title={title}
          lookingForLabel={lookingForLabel}
          profileOrigin={profileOrigin}
          profileQrLabel={profileQrLabel}
          countdown={
            spotlight.rotates ? <LiveFeedCountdown label={rotateLabel} onRotate={onRotate} /> : null
          }
        />
      ) : null}
      {wall.length > 0 ? (
        <RoomWall
          sparse
          people={wall}
          lookingForLabel={lookingForLabel}
          profileOrigin={profileOrigin}
          profileQrLabel={profileQrLabel}
        />
      ) : null}
      <p className="max-w-lg text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft sm:text-xs">
        {gathering}
      </p>
    </div>
  )
}

/**
 * One landscape HDMI frame. Title-safe padding lives on [data-kiosk] in
 * globals.css so TV overscan cannot eat the board. Nothing scrolls.
 */
export function LiveFeedScreen({
  city,
  initial,
  joinUrl,
  qrSvg,
  profileOrigin,
  poll = true,
}: {
  city: OnsiteCitySlug
  initial: OnsiteFeed
  joinUrl: string
  qrSvg: string
  profileOrigin: string
  /** False when the board is a local rehearsal and must not fetch the empty room. */
  poll?: boolean
}) {
  const t = useT()
  const [feed, setFeed] = useState(initial)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/onsite/feed?city=${city}`, { cache: "no-store" })
      if (!res.ok) return
      const next = (await res.json()) as OnsiteFeed
      if (alive.current) setFeed((prev) => mergeFeed(prev, next))
    } catch {
      // Keep the last good frame — the projector must not go blank.
    }
  }, [city])

  useEffect(() => {
    if (!poll) return
    alive.current = true
    void refresh()
    const id = window.setInterval(() => {
      void refresh()
    }, POLL_MS)
    return () => {
      alive.current = false
      window.clearInterval(id)
    }
  }, [poll, refresh])

  const empty = feed.people.length === 0
  const sparse = isSparseRoom(feed.people.length)
  const mixer = city === "berkeley"
  const lookingForLabel = mixer ? "" : t("field.looking_for")
  const profileQrLabel = t("onsite.feed.profile_qr")
  const rest = feed.people.filter(
    (person) => person.id !== feed.spotlight?.left.id && person.id !== feed.spotlight?.right.id,
  )

  return (
    <div data-kiosk className="flex flex-col overflow-hidden bg-paper text-ink">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-2 border-ink bg-paper">
        <div className="brand-band h-1.5 w-full shrink-0" aria-hidden="true" />

        <header
          className={`flex shrink-0 items-center justify-between gap-4 ${
            mixer ? "px-4 py-2" : "items-end border-b-2 border-ink px-5 py-3 sm:gap-8 sm:px-6 sm:py-3.5"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <ForesightMark className={mixer ? "h-6" : "mb-0.5 h-6 sm:h-7"} />
            <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-ink sm:block" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">
                {t(mixer ? "onsite.feed.kicker_berkeley" : "onsite.feed.kicker")}
              </p>
              <h1
                className={`font-listing uppercase leading-none tracking-tight ${
                  mixer ? "text-2xl" : "mt-0.5 text-4xl sm:text-5xl"
                }`}
              >
                {mixer ? t("onsite.feed.title_berkeley") : feed.city_label}
              </h1>
              <p className={`uppercase text-ink-soft ${mixer ? "mt-1 text-[11px] tracking-[0.12em]" : "mt-1.5 text-xs tracking-[0.18em]"}`}>
                {feed.date_label}
                {mixer ? ` · ${t("onsite.feed.pitch_berkeley")}` : ""}
              </p>
            </div>
          </div>
          <div className={`flex shrink-0 flex-col items-end ${mixer ? "gap-1" : "max-w-[46%] gap-2 sm:gap-3"}`}>
            <p className={`tnum font-listing uppercase leading-none ${mixer ? "text-2xl" : "text-4xl sm:text-5xl"}`}>
              {t("onsite.feed.here_count", { n: feed.count })}
            </p>
            {mixer ? null : <KindKey t={t} city={city} />}
          </div>
        </header>
        {mixer ? <TrackLegend t={t} /> : null}

        <div className="flex min-h-0 min-w-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 gap-4 px-4 py-4 sm:gap-5 sm:px-5 sm:py-4">
            {empty ? (
              <div className="flex h-full flex-col justify-center">
                <p className="max-w-3xl font-listing text-5xl uppercase leading-[0.92] tracking-tight sm:text-6xl">
                  {t("onsite.feed.empty")}
                </p>
              </div>
            ) : sparse ? (
              <GatheringRoom
                people={feed.people}
                spotlight={feed.spotlight}
                title={t("onsite.feed.spotlight")}
                gathering={t("onsite.feed.gathering")}
                lookingForLabel={lookingForLabel}
                profileOrigin={profileOrigin}
                profileQrLabel={profileQrLabel}
                rotateLabel={(seconds) => t("onsite.feed.rotate_in", { n: seconds })}
                onRotate={refresh}
              />
            ) : feed.spotlight ? (
              <>
                <LiveFeedPair
                  slim={mixer}
                  left={feed.spotlight.left}
                  right={feed.spotlight.right}
                  title={t("onsite.feed.spotlight")}
                  lookingForLabel={lookingForLabel}
                  profileOrigin={profileOrigin}
                  profileQrLabel={profileQrLabel}
                  countdown={
                    feed.spotlight.rotates ? (
                      <LiveFeedCountdown
                        label={(seconds) => t("onsite.feed.rotate_in", { n: seconds })}
                        onRotate={refresh}
                      />
                    ) : null
                  }
                />
                {(mixer ? feed.people : rest).length > 0 ? (
                  <div className="min-h-0 min-w-0 flex-1">
                    {mixer ? (
                      <MixerRoster
                        people={feed.people}
                        profileOrigin={profileOrigin}
                        profileQrLabel={profileQrLabel}
                      />
                    ) : (
                      <RoomWall
                        people={rest}
                        lookingForLabel={lookingForLabel}
                        profileOrigin={profileOrigin}
                        profileQrLabel={profileQrLabel}
                        profileQr={rest.length <= 28}
                        namesOnly={rest.length > 28}
                      />
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="min-h-0 min-w-0 flex-1">
                <RoomWall
                  people={feed.people}
                  lookingForLabel={lookingForLabel}
                  profileOrigin={profileOrigin}
                  profileQrLabel={profileQrLabel}
                />
              </div>
            )}
          </div>

          <LiveFeedQrRail
            compact={mixer}
            qrSvg={qrSvg}
            joinUrl={joinUrl}
            scanLabel={t("onsite.feed.scan")}
            scanHint={t(mixer ? "onsite.feed.scan_hint_berkeley" : "onsite.feed.scan_hint")}
          />
        </div>
      </div>
    </div>
  )
}
