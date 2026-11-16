"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useT } from "@/lib/i18n/client"

type Role = "founder" | "funder" | "both" | "guest"

/**
 * The walk-up card. Three fields, then the person is on the board.
 */
export function MixerJoinForm() {
  const t = useT()
  const router = useRouter()
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("founder")
  const [line, setLine] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(false)
    try {
      const res = await fetch("/api/v1/onsite/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, line }),
      })
      if (!res.ok) {
        setError(true)
        setPending(false)
        return
      }
      router.refresh()
    } catch {
      setError(true)
      setPending(false)
    }
  }

  const field = "mt-1 min-h-12 w-full border-2 border-ink bg-paper px-3 text-base text-ink outline-none focus:bg-paper-shade"

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8">
      <h2 className="font-listing text-3xl uppercase leading-none tracking-tight">{t("onsite.join.lead")}</h2>
      <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.14em]">
        {t("onsite.join.name")}
        <input required value={name} onChange={(event) => setName(event.target.value)} className={field} autoComplete="name" />
      </label>
      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-[0.14em]">{t("onsite.join.role")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["founder", "funder", "both", "guest"] as const).map((choice) => (
            <label
              key={choice}
              className={`flex min-h-12 cursor-pointer items-center justify-center border-2 px-2 text-center text-xs font-semibold uppercase tracking-wide ${
                role === choice ? "border-ink bg-ink text-paper" : "border-ink bg-paper"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={choice}
                checked={role === choice}
                onChange={() => setRole(choice)}
                className="sr-only"
              />
              {t(`onsite.join.role_${choice}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.14em]">
        {t("onsite.join.line")}
        <input
          required
          value={line}
          maxLength={140}
          onChange={(event) => setLine(event.target.value)}
          placeholder={t("onsite.join.line_placeholder")}
          className={field}
        />
      </label>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-alert">
          {t("onsite.join.error")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-14 w-full items-center justify-center border border-ink bg-mark px-6 text-base font-semibold uppercase tracking-wide text-mark-ink hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {pending ? t("onsite.join.working") : t("onsite.join.submit")}
      </button>
    </form>
  )
}
