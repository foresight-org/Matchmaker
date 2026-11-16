/** Right rail of the HDMI board — always on the same frame as the room. */
export function LiveFeedQrRail({
  qrSvg,
  joinUrl,
  scanLabel,
  scanHint,
  compact = false,
}: {
  qrSvg: string
  joinUrl: string
  scanLabel: string
  scanHint: string
  /** Mixer: a slim rail so the names keep the frame. */
  compact?: boolean
}) {
  let host = joinUrl.replace(/^https:\/\//, "")
  let path = ""
  try {
    const url = new URL(joinUrl)
    host = url.host
    path = url.pathname
  } catch {
    path = ""
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-l-2 border-ink bg-paper-shade ${
        compact
          ? "w-[7.25rem] items-center justify-between px-1.5 py-3"
          : "w-[min(18rem,22vw)] justify-between px-4 py-4 sm:px-5 sm:py-5"
      }`}
    >
      <div className={`flex min-h-0 flex-1 flex-col ${compact ? "w-full items-center justify-center" : "justify-center"}`}>
        <div
          className={`bg-transparent text-ink ${compact ? "aspect-square w-full p-0.5" : "aspect-square w-full p-4"}`}
          role="img"
          aria-label={scanLabel}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p
          className={`font-listing uppercase leading-none tracking-tight ${
            compact ? "mt-2 text-center text-lg" : "mt-4 text-3xl sm:mt-5 sm:text-4xl"
          }`}
        >
          {scanLabel}
        </p>
        <p className={`text-ink-soft ${compact ? "mt-1.5 text-center text-xs font-semibold leading-snug" : "mt-2 text-sm leading-snug sm:mt-3"}`}>
          {scanHint}
        </p>
        {path && !compact ? (
          <p className="mt-3 font-listing text-lg uppercase leading-none tracking-tight text-ink">{path}</p>
        ) : null}
      </div>
      <p
        className={`font-semibold uppercase text-ink-faint ${
          compact ? "mt-2 text-center text-[9px] leading-tight tracking-[0.08em]" : "mt-6 text-[10px] tracking-[0.14em]"
        }`}
      >
        {compact ? path || host : host}
      </p>
    </aside>
  )
}
