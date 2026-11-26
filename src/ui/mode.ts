// Which interface is showing: "classic" (the stone, palette-strip layout of 90s landscape programs)
// or "modern" (the glass sidebar layout). Remembered on this device.
import * as React from "react"

import { keep, recall } from "@/lib/keep"

export type UiMode = "classic" | "modern"
const KEY = "crycer:ui"
let mode: UiMode = recall<UiMode>(KEY, "classic", (v) => v === "classic" || v === "modern")
const subs = new Set<() => void>()
export const getUiMode = () => mode
export function setUiMode(m: UiMode) { mode = m; keep(KEY, m); subs.forEach((f) => f()) }
export const useUiMode = () => React.useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => mode)
