"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useT } from "@/lib/i18n/client"
import { Button } from "@/components/ui/primitives"
import { HereRoomBoard } from "@/components/onsite/here-room-board"
import type { OnsiteCitySlug } from "@/lib/onsite/cities"

type Phase = "joining" | "done" | "error"

/**
 * After email confirm, check in automatically and land on a clear success
 * screen — no extra tap, no accidental detour to matches.
 */
export function HereRoomPanel({
  city,
  orgName,
  hidden,
  already,
  join = true,
  note,
  self,
}: {
  city: OnsiteCitySlug
  orgName: string
  hidden: boolean
  already: boolean
  /** False when this email has no listing for this room, so we only show the board. */
  join?: boolean
  note?: string
  self?: ReactNode
}) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>(!join || already ? "done" : "joining")
  const started = useRef(!join || already)

  async function checkIn() {
    setPhase("joining")
    try {
      const res = await fetch("/api/v1/onsite/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      })
      if (!res.ok) {
        setPhase("error")
        return
      }
      setPhase("done")
    } catch {
      setPhase("error")
    }
  }

  useEffect(() => {
    if (!join || started.current) return
    started.current = true
    void (async () => {
      setPhase("joining")
      try {
        const res = await fetch("/api/v1/onsite/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city }),
        })
        if (!res.ok) {
          setPhase("error")
          return
        }
        setPhase("done")
      } catch {
        setPhase("error")
      }
    })()
  }, [city, join])

  if (phase === "joining") {
    return (
      <div className="mt-10">
        <p className="font-listing text-4xl uppercase leading-none tracking-tight">{orgName}</p>
        <p className="mt-6 text-lg text-ink-soft">{t("onsite.here.working")}</p>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="mt-10">
        <p className="font-listing text-4xl uppercase leading-none tracking-tight">{orgName}</p>
        <p role="alert" className="mt-6 text-sm text-alert">
          {t("onsite.here.error")}
        </p>
        <Button type="button" variant="primary" className="mt-6 min-h-14 w-full text-base" onClick={() => void checkIn()}>
          {t("onsite.here.retry")}
        </Button>
      </div>
    )
  }

  const mixer = city === "berkeley"
  const done = hidden ? t("onsite.here.done_hidden", { name: orgName }) : t("onsite.here.done_body", { name: orgName })

  return (
    <div className={mixer ? "mt-6" : "mt-10"}>
      {note ? (
        <p className="text-base leading-relaxed text-ink-soft">{note}</p>
      ) : mixer ? (
        <p className="text-base leading-relaxed text-ink-soft">{done}</p>
      ) : (
        <>
          <h2 className="font-listing text-4xl uppercase leading-none tracking-tight">{t("onsite.here.done_title")}</h2>
          <p className="mt-4 text-lg leading-relaxed">{done}</p>
        </>
      )}

      {self}
      <HereRoomBoard city={city} />
      {mixer ? (
        <p className="mt-6 text-center text-sm">
          <Link href="/directory?challenge=vision_mixer" className="font-semibold uppercase tracking-wide underline decoration-ink/40 underline-offset-4">
            {t("onsite.self.browse")}
          </Link>
        </p>
      ) : null}

      {mixer ? null : (
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/me/matches"
            className="inline-flex min-h-14 w-full items-center justify-center border border-ink bg-mark px-6 text-base font-semibold uppercase tracking-wide text-mark-ink hover:bg-ink hover:text-paper"
          >
            {t("onsite.here.cta_matches")}
          </Link>
          <Link
            href="/me"
            className="inline-flex min-h-14 w-full items-center justify-center border border-ink bg-paper px-6 text-base font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper"
          >
            {t("onsite.here.cta_profile")}
          </Link>
        </div>
      )}
    </div>
  )
}
