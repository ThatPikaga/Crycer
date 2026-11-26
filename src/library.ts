// My objects: models people bring in, kept on this device (IndexedDB) so they sit in the object
// palette next to the built-in shapes and can be placed again in any world.
import * as React from "react"

import { MAX_MODELS, MAX_THINGS, type ModelGrid, type World, mat, modelSlots, thing } from "./engine/scene"
import { notify } from "./notice"
import { edit, engine, get, patch } from "./store"

export interface LibObject { id: string; name: string; n: number; data: string; thumb: string; at: number }

const DB = "crycer-library", STORE = "objects"
let list: LibObject[] = []
let loaded = false
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

function open(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    if (typeof indexedDB === "undefined") return no(new Error("no storage"))
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" }) }
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((ok, no) => { const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE)); t.oncomplete = () => ok(req.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error) })
  } finally { db.close() }
}

/** Read the saved objects once. Storage that is blocked just gives an empty list. */
export async function loadLibrary(): Promise<LibObject[]> {
  if (loaded) return list
  loaded = true
  try { const all = await tx<LibObject[]>("readonly", (s) => s.getAll() as IDBRequest<LibObject[]>); list = (all ?? []).filter((o) => o && typeof o.id === "string" && typeof o.data === "string").sort((a, b) => a.at - b.at) }
  catch { list = [] }
  emit(); return list
}
export function useLibrary(): LibObject[] {
  React.useEffect(() => { void loadLibrary() }, [])
  return React.useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => list)
}

/** Keep a model in My objects. The same shape brought in twice is kept once. */
export async function addToLibrary(m: { name: string; n: number; data: string; thumb: string }): Promise<LibObject> {
  await loadLibrary()
  const same = list.find((o) => o.n === m.n && o.data === m.data); if (same) return same
  const obj: LibObject = { id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name: m.name, n: m.n, data: m.data, thumb: m.thumb, at: Date.now() }
  list = [...list, obj]; emit()
  try { await tx("readwrite", (s) => s.put(obj)) } catch { notify("Your object is in this world, but this browser would not keep it in My objects for next time.") }
  return obj
}
export async function renameObject(id: string, name: string) {
  const o = list.find((x) => x.id === id); if (!o) return
  const next = { ...o, name: name.slice(0, 40) || o.name }; list = list.map((x) => (x.id === id ? next : x)); emit()
  try { await tx("readwrite", (s) => s.put(next)) } catch { /* the new name lasts until the page closes */ }
}
export async function removeObject(id: string) {
  list = list.filter((x) => x.id !== id); emit()
  try { await tx("readwrite", (s) => s.delete(id)) } catch { /* it comes back next time; nothing is lost */ }
}

const usedSlots = (w: World) => new Set(w.things.filter((t) => t.kind === "model").map((t) => t.slot ?? 0))
const sameGrid = (a: ModelGrid | undefined, o: LibObject) => !!a && a.n === o.n && a.data === o.data

/** Put a saved object in the world: it shares a slot with copies of itself, or takes a free one. False (and a message) if there is no room. */
export function placeObject(o: LibObject): boolean {
  const w = get().world
  if (w.things.length >= MAX_THINGS) { notify(`A world holds up to ${MAX_THINGS} things. Remove one to make room.`); return false }
  const slots = modelSlots(w), used = usedSlots(w)
  let slot = slots.findIndex((g) => sameGrid(g, o))
  if (slot < 0) { for (let k = 0; k < MAX_MODELS; k++) if (!used.has(k)) { slot = k; break } }
  if (slot < 0) { notify(`A world can hold ${MAX_MODELS} different imported objects at once. Remove one of them to bring in another (copies of the same object are free).`); return false }
  const c = w.cam.target, ground = engine?.groundAt(c[0], c[2]) ?? 0, size = 1.2
  const t = thing("model", [c[0] + (Math.random() - 0.5) * 2, Math.max(ground + size + 0.05, c[1]), c[2] + (Math.random() - 0.5) * 2], size, mat("Chrome"), { name: o.name })
  if (slot) t.slot = slot
  edit(`place-object:${t.id}`, (nw) => {
    const grid: ModelGrid = { n: o.n, data: o.data, name: o.name }
    if (slot === 0) nw.model = { n: o.n, data: o.data }
    else { const ms = [...(nw.models ?? [])]; while (ms.length < slot - 1) ms.push(grid); ms[slot - 1] = grid; nw.models = ms }
    nw.things.push(t)
  })
  patch({ sel: { type: "thing", id: t.id } })
  return true
}
