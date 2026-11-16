"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n/client"

type Role = "founder" | "funder" | "both" | "guest"

/**
 * The card this person is showing the room, and the switch that takes it down.
 */
export function MixerSelf({
  name,
  line,
  role,
  hidden,
}: {
  name: string
  line: string
  role: Role
  hidden: boolean
}) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [draftLine, setDraftLine] = useState(line)
  const [draftRole, setDraftRole] = useState<Role>(role)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  async function send(body: { name?: string; line?: string; role?: Role; hidden?: boolean }) {
    setPending(true)
    setSaved(false)
    try {
      const res = await fetch("/api/v1/onsite/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaved(true)
        setOpen(false)
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  const field = "mt-1 min-h-12 w-full border-2 border-ink bg-paper px-3 text-base outline-none focus:bg-paper-shade"

  return (
    <section className="mt-6 border-t border-rule pt-5">
      {hidden ? <p className="text-sm leading-relaxed text-ink-soft">{t("onsite.self.hidden")}</p> : null}
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-12 w-full items-center justify-center border border-ink bg-paper px-4 text-sm font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper"
        >
          {t("onsite.self.update")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void send({ hidden: !hidden })}
          className="inline-flex min-h-12 w-full items-center justify-center border border-ink px-4 text-sm font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper disabled:opacity-60"
        >
          {hidden ? t("onsite.self.show") : t("onsite.self.hide")}
        </button>
      </div>
      {saved ? <p className="mt-3 text-sm text-ink-soft">{t("onsite.self.saved")}</p> : null}
      {open ? (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              name: draftName,
              line: draftLine,
              ...(draftRole === role ? {} : { role: draftRole }),
            })
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-[0.14em]">
            {t("onsite.join.name")}
            <input required value={draftName} onChange={(event) => setDraftName(event.target.value)} className={field} />
          </label>
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.14em]">{t("onsite.join.role")}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["founder", "funder", "both", "guest"] as const).map((choice) => (
                <label
                  key={choice}
                  className={`flex min-h-12 cursor-pointer items-center justify-center border-2 px-2 text-center text-xs font-semibold uppercase tracking-wide ${
                    draftRole === choice ? "border-ink bg-ink text-paper" : "border-ink bg-paper"
                  }`}
                >
                  <input
                    type="radio"
                    name="self-role"
                    value={choice}
                    checked={draftRole === choice}
                    onChange={() => setDraftRole(choice)}
                    className="sr-only"
                  />
                  {t(`onsite.join.role_${choice}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em]">
            {t("onsite.join.line")}
            <input
              required
              maxLength={140}
              value={draftLine}
              onChange={(event) => setDraftLine(event.target.value)}
              className={field}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center border border-ink bg-mark px-4 text-sm font-semibold uppercase tracking-wide text-mark-ink disabled:opacity-60"
          >
            {pending ? t("onsite.self.saving") : t("onsite.self.save")}
          </button>
        </form>
      ) : null}
    </section>
  )
}
