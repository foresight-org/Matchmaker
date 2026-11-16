"use client"

import { useLayoutEffect, useRef } from "react"

/**
 * Shrinks display type until the name fits its cell.
 * Wrapped posters keep the whole name. A packed wall uses one line and
 * an ellipsis once the type cannot go smaller without becoming a blur.
 * ResizeObserver keeps kiosk tiles honest when the grid reflows.
 */
export function FittedName({
  name,
  minPx = 7,
  maxPx = 16,
  lines = "wrap",
  fill = true,
  className = "",
}: {
  name: string
  minPx?: number
  maxPx?: number
  /** `single` keeps a packed wall readable: one line, then an ellipsis. */
  lines?: "wrap" | "single"
  /** False when the name should sit at its type size and leave the rest of the card to the project. */
  fill?: boolean
  className?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text) return

    function fit() {
      let size = maxPx
      text!.style.fontSize = `${size}px`
      const overflows = () =>
        lines === "single"
          ? text!.scrollWidth > box!.clientWidth + 0.5
          : text!.scrollHeight > box!.clientHeight + 0.5 || text!.scrollWidth > box!.clientWidth + 0.5
      // Walk down in quarter-pixel steps until the name fits the cell.
      while (size > minPx && overflows()) {
        size -= 0.25
        text!.style.fontSize = `${size}px`
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [name, minPx, maxPx, lines])

  const shape =
    lines === "single"
      ? "truncate whitespace-nowrap"
      : "hyphens-none text-balance"

  return (
    <div ref={boxRef} className={fill ? "h-full min-h-0 overflow-hidden" : "overflow-hidden"}>
      <h3
        ref={textRef}
        className={`font-listing uppercase leading-[1.05] tracking-tight ${shape} ${className}`}
      >
        {name}
      </h3>
    </div>
  )
}
