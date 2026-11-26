// The classic interface: a stone desk in the manner of 90s landscape programs. A menu strip along the
// top, a palette strip with three tabs (Create, Edit, Sky & Fog), the camera controls down the left
// (plan view, view buttons, camera ball, pads, memory dots, render), the picture in a dark window,
// and an info line along the bottom that names whatever the pointer is over.
import * as React from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsUp, Copy, Dices, Eye, EyeOff, FlipVertical2, Grid3x3, Minus, Plus, Redo2, RotateCcw, RotateCw, Scissors, Shrink, Expand, SlidersHorizontal, Sparkles, Trash2, Undo2, Upload, X, ArrowDownToLine, Shuffle } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QUALITY } from "@/engine/engine"
import { type Kind, type SkyLook, KIND_LABEL, MATERIALS, MAX_THINGS, SEAS, SKIES, applySky, camFrom, mat, seaFrom, thing } from "@/engine/scene"
import { SHAPES } from "@/engine/shapes"
import { WORLDS, WORLD_GROUPS } from "@/engine/worlds"
import { FEATURES, openEmbed } from "@/features"
import { pickCutout, pickFile } from "@/io"
import { type LibObject, placeObject, removeObject, renameObject, useLibrary } from "@/library"
import { notify } from "@/notice"
import { addTerrain, addThing, duplicateThing, edit, editThing, engine, get, patch, redo, removeThing, replaceWorld, rollDice, selectedThing, shareLink, undo, useApp } from "@/store"

import { Inspector } from "../Inspector"
import { setUiMode } from "../mode"
import { FileItems, download, fileName } from "../TopBar"
import { KIND_ICON, newThing, Viewport } from "../Viewport"
import * as I from "./icons"
import "./classic.css"

const Timeline = React.lazy(() => import("../Timeline").then((m) => ({ default: m.Timeline })))

// ---------- the info line: anything with data-tip names itself there when the pointer is over it ----------
function useHoverTip() {
  const [tip, setTip] = React.useState("")
  React.useEffect(() => {
    const over = (e: Event) => { const el = (e.target as HTMLElement | null)?.closest?.("[data-tip]") as HTMLElement | null; setTip(el?.dataset.tip ?? "") }
    addEventListener("pointerover", over); addEventListener("focusin", over); return () => { removeEventListener("pointerover", over); removeEventListener("focusin", over) }
  }, [])
  return tip
}

const SHAPE_ICON: Partial<Record<Kind, React.ComponentType<{ className?: string }>>> = {
  sphere: I.SphereIcon, box: I.CubeIcon, pyramid: I.PyramidIcon, cylinder: I.CylinderIcon, cone: I.ConeIcon, torus: I.TorusIcon, disc: I.DiscIcon,
  stone: I.StoneIcon, blob: I.BlobIcon, tree: I.TreeIcon, pine: I.PineIcon, crag: I.CragIcon, model: I.ModelIcon, text: I.TextIcon, cutout: I.CutoutIcon,
}
export const classicIcon = (k: Kind) => SHAPE_ICON[k] ?? KIND_ICON[k] ?? I.ModelIcon

function Tile({ tip, onClick, children, group, pressed, off, testid, onContextMenu }: { tip: string; onClick: () => void; children: React.ReactNode; group: string; pressed?: boolean; off?: boolean; testid?: string; onContextMenu?: (e: React.MouseEvent) => void }) {
  return <button type="button" className={`cl-tile ${group}`} data-tip={tip} aria-label={tip} aria-pressed={pressed} data-off={off || undefined} onClick={onClick} onContextMenu={onContextMenu} data-testid={testid}>{children}</button>
}
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex shrink-0 flex-col items-center gap-1"><div className="flex gap-1.5">{children}</div><span className="cl-engrave">{label}</span></div>
}
const Divider = () => <div className="mx-1 h-12 w-px shrink-0 self-start bg-black/40 shadow-[1px_0_0_rgba(255,248,230,.12)]" />

// ---------- Create ----------
function full() { if (get().world.things.length >= MAX_THINGS) { notify(`A world holds up to ${MAX_THINGS} things. Remove one to make room.`); return true } return false }
function addLight(kind: "lamp" | "spot" | "neon") {
  if (full()) return
  const c = get().world.cam.target
  if (kind === "neon") addThing(thing("torus", [c[0], Math.max(1.4, c[1]), c[2]], [1.1, 0.25, 1.1], mat("Neon"), { name: "Neon ring", round: 0.12, rot: [0, 90, 0] }))
  else addThing(thing("sphere", [c[0], kind === "spot" ? 6 : Math.max(2, c[1] + 1.5), c[2]], 0.3, mat("Lamp"), { name: kind === "spot" ? "Spotlight" : "Lamp", ...(kind === "spot" ? { beam: 34 } : {}) }))
}
const seaLook = (name: string) => { const l = SEAS.find((s) => s.name === name)!; edit("sea-look", (w) => { Object.assign(w.sea, seaFrom(l, { wave: w.sea.wave, grain: w.sea.grain, scale: w.sea.scale })) }); patch({ sel: { type: "sea" } }) }

async function importObject() {
  const f = await pickFile(".glb,.gltf,.obj"); if (!f) return
  const busy = notify("Reading your model…", { ms: 0 })
  const { importModel } = await import("@/io"); const ok = await importModel(f)
  const { dismiss } = await import("@/notice"); dismiss(busy)
  if (ok) notify("Saved to My objects. Click it in the palette any time to place it again.")
}

function MyObject({ o }: { o: LibObject }) {
  const [menu, setMenu] = React.useState(false)
  return (
    <div className="group/obj relative">
      <Tile group="cl-g-mine" tip={`${o.name}: click to place it. Right-click to rename or remove.`} onClick={() => placeObject(o)} onContextMenu={(e) => { e.preventDefault(); setMenu(true) }} testid="my-object">
        {o.thumb ? <img src={o.thumb} alt="" /> : <I.ModelIcon />}
      </Tile>
      <button type="button" className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-black/80 text-white ring-1 ring-white/20 group-hover/obj:grid" aria-label={`Remove ${o.name} from My objects`} data-tip={`Remove ${o.name} from My objects (worlds that use it keep it)`} onClick={() => { if (confirm(`Remove "${o.name}" from My objects? Worlds that already use it keep it.`)) void removeObject(o.id) }}><X className="size-2.5" /></button>
      {menu && <DropdownMenu open={menu} onOpenChange={setMenu}><DropdownMenuTrigger render={<span className="absolute inset-0" />} /><DropdownMenuContent className="w-44">
        <DropdownMenuLabel>{o.name}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => placeObject(o)}>Place in the world</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { const n = prompt("Name this object", o.name); if (n) void renameObject(o.id, n) }}>Rename…</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void removeObject(o.id)}>Remove from My objects</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>}
    </div>
  )
}

function CreatePalette() {
  const land = useApp((s) => s.world.land.on), lib = useLibrary()
  const shapes: Kind[] = ["sphere", "box", "pyramid", "cylinder", "cone", "torus", "disc", "blob", ...SHAPES.map((s) => s.id)]
  return (
    <div className="cl-scroll flex items-start gap-2 overflow-x-auto px-3 pt-2.5 pb-1.5" data-testid="palette-create">
      <Group label="Planes & land">
        <Tile group="cl-g-plane" tip="Water plane: an endless sea" onClick={() => seaLook("Ocean")}><I.WaterIcon /></Tile>
        <Tile group="cl-g-plane" tip="Ground plane: endless sand" onClick={() => seaLook("Dunes")}><I.GroundIcon /></Tile>
        <Tile group="cl-g-plane" tip="Checker plane: the classic floor" onClick={() => seaLook("Checker")}><I.CheckerIcon /></Tile>
        <Tile group="cl-g-plane" tip="Cloud layer: more cloud in the sky" onClick={() => { edit("clouds", (w) => { w.sky.cloud = Math.min(1, Math.max(0.45, w.sky.cloud + 0.25)) }); patch({ sel: { type: "sky" } }) }}><I.CloudIcon /></Tile>
        <Tile group="cl-g-plane" tip="Terrain: a new mountain to shape" onClick={addTerrain} testid="create-terrain"><I.TerrainIcon /></Tile>
        <Tile group="cl-g-plane" tip={land ? "Island: show its dials" : "Island: raise one from the sea"} pressed={land} onClick={() => { if (!land) edit("land-on", (w) => { w.land.on = true }); patch({ sel: { type: "land" } }) }}><I.IslandIcon /></Tile>
      </Group>
      <Divider />
      <Group label="Nature">
        {(["tree", "pine", "stone", "crag"] as Kind[]).map((k) => { const Ic = classicIcon(k); return <Tile key={k} group="cl-g-nature" tip={`${KIND_LABEL[k]}: add one`} onClick={() => { if (!full()) newThing(k) }}><Ic /></Tile> })}
      </Group>
      <Divider />
      <Group label="Shapes">
        {shapes.map((k) => { const Ic = classicIcon(k); return <Tile key={k} group="cl-g-shape" tip={`${KIND_LABEL[k] ?? k}: add one`} onClick={() => { if (!full()) newThing(k) }} testid={`create-${k}`}><Ic /></Tile> })}
      </Group>
      <Divider />
      <Group label="Pictures & type">
        <Tile group="cl-g-shape" tip="Lettering: 3D words standing in the world" onClick={() => patch({ sel: { type: "title" } })}><I.TextIcon /></Tile>
        <Tile group="cl-g-shape" tip="Cutout: a flat picture from a transparent PNG" onClick={() => void pickCutout()}><I.CutoutIcon /></Tile>
      </Group>
      <Divider />
      <Group label="Light">
        <Tile group="cl-g-light" tip="Lamp: a glowing ball that lights all around" onClick={() => addLight("lamp")}><I.LampIcon /></Tile>
        <Tile group="cl-g-light" tip="Spotlight: a beam pointing down" onClick={() => addLight("spot")}><I.SpotIcon /></Tile>
        <Tile group="cl-g-light" tip="Neon ring: a glowing tube" onClick={() => addLight("neon")}><I.NeonIcon /></Tile>
      </Group>
      <Divider />
      <Group label={`My objects ${lib.length ? `· ${lib.length}` : ""}`}>
        <Tile group="cl-g-mine" tip="Import a 3D model (.glb, .gltf, .obj). It is saved to My objects on this device." onClick={() => void importObject()} testid="import-object"><Upload className="!size-6" /></Tile>
        {lib.map((o) => <MyObject key={o.id} o={o} />)}
        {!lib.length && <span className="self-center px-1 text-[11px] leading-tight text-[var(--cl-ink-faint)] max-w-28">Your imported models appear here.</span>}
      </Group>
    </div>
  )
}

// ---------- Edit ----------
const ADD_KINDS: Kind[] = ["sphere", "box", "pyramid", "cylinder", "cone", "torus", "disc", "blob", "stone", "tree", "pine", "crag", ...SHAPES.map((s) => s.id)]
function scatter(id: string) {
  const w = get().world, t = w.things.find((x) => x.id === id); if (!t) return
  const n = Math.min(5, MAX_THINGS - w.things.length); if (n <= 0) { notify(`A world holds up to ${MAX_THINGS} things.`); return }
  edit("scatter:" + id, (nw) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5, k = 0.6 + Math.random() * 0.8
    nw.things.push({ ...structuredClone(t), id: `${t.id.slice(0, 20)}-${Date.now().toString(36)}${i}`, name: `${t.name} ${i + 2}`, pos: [t.pos[0] + Math.cos(a) * r, t.pos[1] * k, t.pos[2] + Math.sin(a) * r], size: t.size.map((s) => s * k) as typeof t.size, rot: [Math.random() * 360, t.rot[1], t.rot[2]] }) } })
}
const ball = (m: (typeof MATERIALS)[number]) => {
  const c2 = m.color2 ?? m.color
  if (m.glow && m.glow > 0.5) return `radial-gradient(circle at 50% 50%, #fff 0 18%, ${m.color} 45%, transparent 75%)`
  if (m.texture === "checker") return `radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), transparent 40%), conic-gradient(${m.color} 25%, ${c2} 0 50%, ${m.color} 0 75%, ${c2} 0)`
  if (m.texture && m.texture !== "none") return `radial-gradient(circle at 35% 30%, rgba(255,255,255,.6), transparent 40%), radial-gradient(circle at 60% 70%, ${c2}, ${m.color} 70%)`
  return `radial-gradient(circle at 35% 30%, #fff 0 6%, ${m.color} 35%, color-mix(in oklch, ${m.color} 35%, black) 100%)`
}
function EditPalette({ attrs, setAttrs }: { attrs: boolean; setAttrs: (v: boolean) => void }) {
  const t = useApp(selectedThing)
  if (!t) return (
    <div className="flex h-[78px] items-center gap-3 px-4 text-[12.5px] text-[var(--cl-ink-dim)]" data-testid="palette-edit">
      <SlidersHorizontal className="size-5 opacity-70" />Pick a thing in the picture (or add one from Create) to resize, turn, move or paint it.
    </div>)
  const id = t.id, scale = (k: number, axis?: 0 | 1 | 2) => editThing(id, "size", (x) => { x.size = x.size.map((s, i) => (axis === undefined || axis === i ? Math.max(0.05, Math.min(200, s * k)) : s)) as typeof x.size })
  const turn = (d: number, axis: 0 | 1 | 2 = 0) => editThing(id, "turn", (x) => { x.rot[axis] = ((x.rot[axis] + d) % 360 + 360) % 360 })
  const lift = (d: number) => editThing(id, "lift", (x) => { x.pos[1] = Math.max(-20, x.pos[1] + d) })
  const B = ({ tip, on, children, pressed }: { tip: string; on: () => void; children: React.ReactNode; pressed?: boolean }) => <button type="button" className="cl-btn cl-icon-btn" data-tip={tip} aria-label={tip} aria-pressed={pressed} onClick={on}>{children}</button>
  return (
    <div className="cl-scroll flex items-start gap-2 overflow-x-auto px-3 pt-2.5 pb-1.5" data-testid="palette-edit">
      <Group label="Resize"><div className="grid grid-cols-3 gap-1">
        <B tip="Bigger" on={() => scale(1.15)}><Expand /></B><B tip="Smaller" on={() => scale(1 / 1.15)}><Shrink /></B><B tip="Taller" on={() => scale(1.15, 1)}><ChevronsUp /></B>
        <B tip="Wider" on={() => scale(1.15, 0)}><ArrowRight /></B><B tip="Deeper" on={() => scale(1.15, 2)}><ArrowDown /></B><B tip="Flatter" on={() => scale(1 / 1.15, 1)}><ChevronsDown /></B>
      </div></Group>
      <Divider />
      <Group label="Rotate"><div className="grid grid-cols-3 gap-1">
        <B tip="Turn left 15°" on={() => turn(-15)}><RotateCcw /></B><B tip="Turn right 15°" on={() => turn(15)}><RotateCw /></B><B tip="Tilt 15°" on={() => turn(15, 1)}><FlipVertical2 /></B>
        <B tip="Roll 15°" on={() => turn(15, 2)}><RotateCw className="rotate-90" /></B><B tip="Straighten (no turn)" on={() => editThing(id, "unrotate", (x) => { x.rot = [0, 0, 0] })}><Minus /></B><B tip="Random turn" on={() => editThing(id, "turn", (x) => { x.rot[0] = Math.random() * 360 })}><Shuffle /></B>
      </div></Group>
      <Divider />
      <Group label="Move"><div className="grid grid-cols-3 gap-1">
        <B tip="Raise" on={() => lift(0.25)}><ArrowUp /></B><B tip="Lower" on={() => lift(-0.25)}><ArrowDown /></B>
        <B tip="Drop to the ground" on={() => { const g = engine?.groundAt(t.pos[0], t.pos[2]) ?? 0; editThing(id, "land", (x) => { x.pos[1] = g + x.size[1] }) }}><ArrowDownToLine /></B>
        <B tip="Bring to the middle of the view" on={() => { const c = get().world.cam.target; editThing(id, "centre", (x) => { x.pos[0] = c[0]; x.pos[2] = c[2] }) }}><Plus /></B>
        <B tip="Scatter 5 copies around it" on={() => scatter(id)}><Sparkles /></B>
        <B tip="Make a copy (Ctrl D)" on={() => duplicateThing(id)}><Copy /></B>
      </div></Group>
      <Divider />
      <Group label="Do"><div className="grid grid-cols-2 gap-1">
        <B tip={t.role === "cut" ? "Cutting a hole: make it solid again" : "Cut a hole with it in what it touches"} pressed={t.role === "cut"} on={() => editThing(id, "role", (x) => { x.role = x.role === "cut" ? "solid" : "cut" })}><Scissors /></B>
        <B tip={t.hidden ? "Show it" : "Hide it"} on={() => editThing(id, "hide", (x) => { x.hidden = !x.hidden })}>{t.hidden ? <EyeOff /> : <Eye />}</B>
        <B tip="Remove it (Delete)" on={() => removeThing(id)}><Trash2 /></B>
        <B tip={attrs ? "Hide every dial for it" : "Every dial for it"} pressed={attrs} on={() => setAttrs(!attrs)}><SlidersHorizontal /></B>
      </div></Group>
      <Divider />
      {t.kind !== "model" && t.kind !== "text" && t.kind !== "cutout" && <><Group label="Change shape">
        <DropdownMenu><DropdownMenuTrigger render={<button type="button" className="cl-tile cl-g-shape" data-tip="Change it into another shape, keeping its size and place" aria-label="Change shape" />}>{React.createElement(classicIcon(t.kind))}</DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 w-44">{ADD_KINDS.map((k) => { const Ic = classicIcon(k); return <DropdownMenuItem key={k} onClick={() => editThing(id, "kind", (x) => { x.kind = k })}><Ic className="size-4" /> {KIND_LABEL[k] ?? k}</DropdownMenuItem> })}</DropdownMenuContent></DropdownMenu>
      </Group><Divider /></>}
      <Group label={`Materials · ${t.mat.name}`}><div className="grid grid-flow-col grid-rows-2 gap-1">
        {MATERIALS.map((m) => <button key={m.name} type="button" className="size-[21px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,.7),inset_0_0_0_1px_rgba(0,0,0,.3)] outline-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-[var(--cl-accent)] aria-pressed:ring-2 aria-pressed:ring-[var(--cl-accent-2)]"
          style={{ background: ball(m) }} data-tip={`Material: ${m.name}`} aria-label={`Material: ${m.name}`} aria-pressed={t.mat.name === m.name} onClick={() => editThing(id, "mat", (x) => { x.mat = { ...mat(m.name) } })} />)}
      </div></Group>
    </div>
  )
}

// ---------- Sky & Fog ----------
function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void }) {
  return <label className="flex w-28 flex-col gap-0.5" data-tip={`${label}: ${Math.round(((value - min) / (max - min)) * 100)}%`}>
    <span className="cl-engrave">{label}</span>
    <input type="range" className="cl-range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
  </label>
}
/** The sun as a dot on a dome seen from above: round the edge is where it sits, in or out is how high. */
function SunDial() {
  const sun = useApp((s) => s.world.sky.sun), moonOn = useApp((s) => s.world.sky.moon > 0), moon = useApp((s) => [s.world.sky.moonAz, s.world.sky.moonEl] as const)
  const ref = React.useRef<HTMLDivElement>(null), R = 34
  const pos = (az: number, el: number) => { const r = (1 - Math.min(1, Math.max(0, el / (Math.PI / 2)))) * R; return { left: R + 6 + Math.sin(az) * r, top: R + 6 - Math.cos(az) * r } }
  const set = (e: React.PointerEvent) => { const b = ref.current!.getBoundingClientRect(), x = e.clientX - b.left - R - 6, y = e.clientY - b.top - R - 6, r = Math.min(R, Math.hypot(x, y))
    edit("sun", (w) => { w.sky.sun = { az: Math.atan2(x, -y), el: Math.max(0.02, (1 - r / R) * (Math.PI / 2)) } }) }
  const s = pos(sun.az, sun.el), m = pos(moon[0], moon[1])
  return <div className="flex shrink-0 flex-col items-center gap-1">
    <div ref={ref} className="cl-tray relative cursor-crosshair touch-none" style={{ width: R * 2 + 12, height: R * 2 + 12 }} data-tip="Sun position: drag the sun. The middle is straight overhead, the edge is the horizon."
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); set(e) }} onPointerMove={(e) => { if (e.buttons) set(e) }} role="slider" aria-label="Sun position" aria-valuetext={`height ${Math.round((sun.el * 180) / Math.PI)} degrees`} aria-valuenow={Math.round((sun.el * 180) / Math.PI)} tabIndex={0}
      onKeyDown={(e) => { const k = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key]; if (k) { e.preventDefault(); edit("sun", (w) => { w.sky.sun = { az: w.sky.sun.az + k[0], el: Math.min(1.55, Math.max(0.02, w.sky.sun.el + k[1])) } }) } }}>
      <div className="pointer-events-none absolute inset-[6px] rounded-full border border-white/10" /><div className="pointer-events-none absolute inset-[23px] rounded-full border border-white/5" />
      <span className="pointer-events-none absolute text-[8px] text-white/30" style={{ left: R + 3, top: 0 }}>N</span>
      {moonOn && <span className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-[#dfe6ff] shadow-[0_0_6px_#dfe6ff]" style={m} />}
      <span className="pointer-events-none absolute size-3.5 -translate-1/2 rounded-full bg-[radial-gradient(circle,#fff,#ffd27a_60%,#e2802a)] shadow-[0_0_10px_#ffd27a]" style={s} />
    </div><span className="cl-engrave">Sun</span></div>
}
function SkyPalette() {
  const sky = useApp((s) => s.world.sky), sea = useApp((s) => s.world.sea)
  const set = (label: string, fn: (s: typeof sky) => void) => edit("sky-" + label, (w) => fn(w.sky))
  const swatch = (l: SkyLook) => `linear-gradient(180deg, ${l.zenith}, ${l.horizon} 75%, ${l.haze})`
  return (
    <div className="cl-scroll flex items-start gap-2 overflow-x-auto px-3 pt-2.5 pb-1.5" data-testid="palette-sky">
      <SunDial />
      <Divider />
      <div className="flex shrink-0 flex-col gap-0.5">
        <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
          <Slider label="Haze" value={sky.hazeAmt} onChange={(v) => set("haze", (s) => { s.hazeAmt = v })} />
          <Slider label="Fog" value={sky.fog} onChange={(v) => set("fog", (s) => { s.fog = v })} />
          <Slider label="Clouds" value={sky.cloud} onChange={(v) => set("cloud", (s) => { s.cloud = v })} />
          <Slider label="Stars" value={sky.stars} max={2.5} onChange={(v) => set("stars", (s) => { s.stars = v })} />
          <Slider label="Moon" value={sky.moon} max={1.5} onChange={(v) => set("moon", (s) => { s.moon = v })} />
          <Slider label="Sun glow" value={sky.sunGlow} max={3} onChange={(v) => set("glow", (s) => { s.sunGlow = v })} />
        </div>
      </div>
      <Divider />
      <Group label="Skies"><div className="grid grid-flow-col grid-rows-2 gap-1">
        {SKIES.map((l) => <button key={l.name} type="button" className="h-[21px] w-7 rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,.7),inset_0_0_0_1px_rgba(0,0,0,.35)] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--cl-accent)] aria-pressed:ring-2 aria-pressed:ring-[var(--cl-accent-2)]"
          style={{ background: swatch(l) }} aria-pressed={sky.zenith === l.zenith && sky.horizon === l.horizon} data-tip={`Sky: ${l.name}`} aria-label={`Sky: ${l.name}`} onClick={() => edit("sky-look", (w) => applySky(w.sky, l))} />)}
      </div></Group>
      <Divider />
      <Group label="Sea & floor"><div className="grid grid-flow-col grid-rows-2 gap-1">
        {SEAS.map((l) => <button key={l.name} type="button" className="h-[21px] w-7 rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,.7),inset_0_0_0_1px_rgba(0,0,0,.35)] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--cl-accent)] aria-pressed:ring-2 aria-pressed:ring-[var(--cl-accent-2)]"
          style={{ background: l.kind === "checker" ? `conic-gradient(${l.c1} 25%, ${l.c2} 0 50%, ${l.c1} 0 75%, ${l.c2} 0) 0 0/10px 10px` : l.kind === "none" ? "repeating-linear-gradient(45deg,#333 0 3px,#222 3px 6px)" : `linear-gradient(180deg, ${l.c2}, ${l.c1})` }}
          aria-pressed={sea.kind === l.kind && sea.c1 === l.c1} data-tip={`Sea: ${l.name}`} aria-label={`Sea: ${l.name}`} onClick={() => seaLook(l.name)} />)}
      </div></Group>
      <Divider />
      <Group label="All dials">
        <button type="button" className="cl-btn h-[44px]" data-tip="Every sky dial: colours, clouds, fog, moon, rainbow…" onClick={() => patch({ sel: { type: "sky" } })}><SlidersHorizontal /> Sky</button>
        <button type="button" className="cl-btn h-[44px]" data-tip="Every sea dial: waves, colours, reflection" onClick={() => patch({ sel: { type: "sea" } })}><SlidersHorizontal /> Sea</button>
      </Group>
    </div>
  )
}

// ---------- the camera column ----------
/** The world from above: the sea, the land, every thing as a dot, and where the camera looks from. Drag a dot to move it, drag elsewhere to move the view. */
function PlanView() {
  const w = useApp((s) => s.world), sel = useApp((s) => s.sel), ref = React.useRef<HTMLCanvasElement>(null), size = 168
  const span = Math.max(14, w.cam.dist * 1.25), c = w.cam.target
  const toPx = (x: number, z: number) => [size / 2 + ((x - c[0]) / span) * (size / 2), size / 2 + ((z - c[2]) / span) * (size / 2)] as const
  const toWorld = (px: number, py: number) => [c[0] + ((px - size / 2) / (size / 2)) * span, c[2] + ((py - size / 2) / (size / 2)) * span] as const
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = size * dpr; const g = cv.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.fillStyle = w.sea.kind === "none" ? "#15161a" : w.sea.c1; g.fillRect(0, 0, size, size); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, size, size)
    g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; const step = span > 40 ? 10 : 2
    for (let v = Math.ceil((c[0] - span) / step) * step; v < c[0] + span; v += step) { const [x] = toPx(v, 0); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, size); g.stroke() }
    for (let v = Math.ceil((c[2] - span) / step) * step; v < c[2] + span; v += step) { const [, y] = toPx(0, v); g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke() }
    for (const l of [w.land, ...(w.terrains ?? [])]) { if (!l.on) continue; const [x, y] = toPx(l.pos?.[0] ?? 0, l.pos?.[2] ?? 0), r = (l.radius * (l.mode === "range" ? 3 : 1.2) / span) * (size / 2)
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, l.c3); gr.addColorStop(0.55, l.c2); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
    for (const t of w.things) { if (t.hidden) continue; const [x, y] = toPx(t.pos[0], t.pos[2]), r = Math.max(2.5, (Math.max(t.size[0], t.size[2]) / span) * (size / 2))
      g.fillStyle = t.mat.color; g.globalAlpha = t.role === "cut" ? 0.4 : 1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1
      g.strokeStyle = sel.type === "thing" && sel.id === t.id ? "#7fd6c9" : "rgba(0,0,0,.6)"; g.lineWidth = sel.type === "thing" && sel.id === t.id ? 2 : 1; g.stroke() }
    // the camera: where it stands and the wedge it sees
    const cp = toPx(c[0] + Math.sin(w.cam.yaw) * Math.cos(w.cam.pitch) * w.cam.dist, c[2] + Math.cos(w.cam.yaw) * Math.cos(w.cam.pitch) * w.cam.dist), ang = Math.atan2(size / 2 - cp[1], size / 2 - cp[0]), half = ((w.cam.fov / 2) * Math.PI) / 180
    g.fillStyle = "rgba(226,176,74,.16)"; g.beginPath(); g.moveTo(cp[0], cp[1]); g.arc(cp[0], cp[1], size * 1.2, ang - half, ang + half); g.closePath(); g.fill()
    g.fillStyle = "#e2b04a"; g.beginPath(); g.arc(cp[0], cp[1], 4, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#e2b04a"; g.beginPath(); g.arc(size / 2, size / 2, 3, 0, Math.PI * 2); g.stroke()
  })
  const drag = React.useRef<null | { id?: string; x: number; y: number }>(null)
  const local = (e: React.PointerEvent) => { const b = ref.current!.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * size, ((e.clientY - b.top) / b.height) * size] as const }
  const down = (e: React.PointerEvent) => { ref.current!.setPointerCapture(e.pointerId); const [px, py] = local(e)
    const hit = [...get().world.things].reverse().find((t) => { if (t.hidden) return false; const [x, y] = toPx(t.pos[0], t.pos[2]); return Math.hypot(x - px, y - py) < Math.max(6, (Math.max(t.size[0], t.size[2]) / span) * (size / 2) + 2) })
    if (hit) patch({ sel: { type: "thing", id: hit.id } }); drag.current = { id: hit?.id, x: px, y: py } }
  const move = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; const [px, py] = local(e)
    if (d.id) { const [x, z] = toWorld(px, py); editThing(d.id, "move", (t) => { t.pos[0] = x; t.pos[2] = z }) }
    else { const dx = ((px - d.x) / (size / 2)) * span, dz = ((py - d.y) / (size / 2)) * span; edit("pan", (nw) => { nw.cam.target = [nw.cam.target[0] - dx, nw.cam.target[1], nw.cam.target[2] - dz] }); d.x = px; d.y = py } }
  return <canvas ref={ref} className="cl-tray block cursor-pointer touch-none" style={{ width: size, height: size }} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null }} data-tip="Plan view: the world from above. Drag a dot to move a thing, drag elsewhere to move the view." aria-label="Plan view of the world from above" data-testid="plan-view" />
}

/** Drag the ball to swing the camera round what it looks at. */
function CameraBall() {
  const last = React.useRef<[number, number] | null>(null)
  return <div className="cl-ball size-[86px]" role="slider" aria-label="Camera ball: drag to swing the camera around" aria-valuenow={0} tabIndex={0} data-tip="Camera ball: drag to swing the camera around what it looks at. Arrow keys work too." data-testid="camera-ball"
    onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = [e.clientX, e.clientY] }}
    onPointerMove={(e) => { const l = last.current; if (!l) return; const dx = e.clientX - l[0], dy = e.clientY - l[1]; last.current = [e.clientX, e.clientY]; edit("orbit", (w) => { w.cam.yaw -= dx * 0.012; w.cam.pitch = Math.max(0.01, Math.min(1.5, w.cam.pitch + dy * 0.008)) }) }}
    onPointerUp={() => { last.current = null }} onPointerCancel={() => { last.current = null }}
    onKeyDown={(e) => { const k = { ArrowLeft: [0.08, 0], ArrowRight: [-0.08, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key]; if (k) { e.preventDefault(); edit("orbit", (w) => { w.cam.yaw += k[0]; w.cam.pitch = Math.max(0.01, Math.min(1.5, w.cam.pitch + k[1])) }) } }} />
}
/** A button that keeps acting while held. */
function Hold({ tip, act, children }: { tip: string; act: () => void; children: React.ReactNode }) {
  const t = React.useRef<number>(0), stop = () => { clearInterval(t.current); t.current = 0 }
  React.useEffect(() => stop, [])
  return <button type="button" className="cl-btn cl-icon-btn !h-6 !w-6" data-tip={tip} aria-label={tip} onClick={(e) => { if (e.detail === 0) act() }} onPointerDown={() => { act(); stop(); t.current = window.setInterval(act, 60) }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>{children}</button>
}
function pan(fx: number, fz: number) { edit("pan", (w) => { const k = w.cam.dist * 0.035, s = Math.sin(w.cam.yaw), c = Math.cos(w.cam.yaw); w.cam.target = [w.cam.target[0] + (fx * c - fz * s) * k, w.cam.target[1], w.cam.target[2] + (-fx * s - fz * c) * k] }) }
/** A small knob: drag up and down to turn it. */
function Knob({ label, value, min, max, onChange, fmt }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  const last = React.useRef<number | null>(null), f = (value - min) / (max - min), a = -135 + f * 270
  return <div className="flex flex-col items-center gap-0.5">
    <div className="relative size-8 cursor-ns-resize touch-none rounded-full bg-[radial-gradient(circle_at_40%_35%,#6d6860,#2a2723)] shadow-[0_2px_4px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,248,230,.2)]" role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(value)} data-tip={`${label}: ${fmt(value)}. Drag up or down.`}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = e.clientY }} onPointerMove={(e) => { if (last.current === null) return; const dy = last.current - e.clientY; last.current = e.clientY; onChange(Math.min(max, Math.max(min, value + (dy * (max - min)) / 160))) }} onPointerUp={() => { last.current = null }}
      onKeyDown={(e) => { const d = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (d) { e.preventDefault(); onChange(Math.min(max, Math.max(min, value + (d * (max - min)) / 40))) } }}>
      <span className="pointer-events-none absolute top-1/2 left-1/2 h-3 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded bg-[var(--cl-accent)] shadow-[0_0_4px_var(--cl-accent)]" style={{ transform: `translate(-50%,-100%) rotate(${a}deg)` }} />
    </div><span className="cl-engrave !text-[8.5px]">{label}</span></div>
}
function ControlColumn({ rendering, render }: { rendering: number | null; render: () => void }) {
  const views = useApp((s) => s.world.views), cam = useApp((s) => s.world.cam), quality = useApp((s) => s.quality), wires = useApp((s) => s.wires)
  const setView = (label: string, fn: (c: typeof cam) => void) => edit("view-" + label, (w) => fn(w.cam))
  const VB = ({ tip, on, children }: { tip: string; on: () => void; children: React.ReactNode }) => <button type="button" className="cl-tile !size-9 cl-g-shape" data-tip={tip} aria-label={tip} onClick={on}>{children}</button>
  return (
    <div className="cl-slab cl-scroll flex w-[196px] shrink-0 flex-col items-center gap-2.5 overflow-y-auto p-3 max-md:w-full max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-hidden" aria-label="Camera and render controls" data-testid="control-column">
      <div className="flex flex-col items-center gap-1"><PlanView /><span className="cl-engrave">Plan view</span></div>
      <div className="flex shrink-0 gap-1.5">
        <VB tip="Eye-level view" on={() => setView("eye", (c) => { c.pitch = 0.12 })}><I.EyeViewIcon /></VB>
        <VB tip="Top view: straight down" on={() => setView("top", (c) => { c.pitch = 1.5 })}><I.TopViewIcon /></VB>
        <VB tip="Front view" on={() => setView("front", (c) => { c.yaw = 0; c.pitch = 0.18 })}><I.FrontViewIcon /></VB>
        <VB tip="Side view" on={() => setView("side", (c) => { c.yaw = Math.PI / 2; c.pitch = 0.18 })}><I.SideViewIcon /></VB>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="grid grid-cols-3 gap-0.5" aria-label="Move the view">
          <span /><Hold tip="Move the view forward" act={() => pan(0, 1)}><ArrowUp /></Hold><span />
          <Hold tip="Move the view left" act={() => pan(-1, 0)}><ArrowLeft /></Hold><span className="grid place-items-center"><span className="size-1.5 rounded-full bg-black/50" /></span><Hold tip="Move the view right" act={() => pan(1, 0)}><ArrowRight /></Hold>
          <span /><Hold tip="Move the view back" act={() => pan(0, -1)}><ArrowDown /></Hold><span />
        </div>
        <CameraBall />
        <div className="flex flex-col gap-0.5">
          <Hold tip="Zoom in" act={() => edit("zoom", (w) => { w.cam.dist = Math.max(3, w.cam.dist * 0.96) })}><Plus /></Hold>
          <Hold tip="Camera up" act={() => edit("rise", (w) => { w.cam.target = [w.cam.target[0], w.cam.target[1] + w.cam.dist * 0.02, w.cam.target[2]] })}><ChevronsUp /></Hold>
          <Hold tip="Camera down" act={() => edit("rise", (w) => { w.cam.target = [w.cam.target[0], Math.max(0, w.cam.target[1] - w.cam.dist * 0.02), w.cam.target[2]] })}><ChevronsDown /></Hold>
          <Hold tip="Zoom out" act={() => edit("zoom", (w) => { w.cam.dist = Math.min(120, w.cam.dist / 0.96) })}><Minus /></Hold>
        </div>
      </div>
      <div className="flex shrink-0 items-end gap-3">
        <Knob label="Lens" value={cam.fov} min={12} max={120} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => edit("fov", (w) => { w.cam.fov = v })} />
        <Knob label="Bank" value={cam.roll} min={-45} max={45} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => edit("roll", (w) => { w.cam.roll = v })} />
        <button type="button" className="cl-btn cl-icon-btn mb-3" data-tip="Reset the camera" aria-label="Reset the camera" onClick={() => edit("cam-reset", (w) => { const d = camFrom(); w.cam = { ...d, target: w.cam.target } })}><RotateCcw /></button>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="flex gap-1.5" role="group" aria-label="Memory: saved camera views">
          {Array.from({ length: 7 }, (_, i) => { const v = views[i]; return <button key={i} type="button" className="cl-dot" data-on={!!v} aria-label={v ? `Go to saved view ${i + 1}` : `Save this view as ${i + 1}`}
            data-tip={v ? `View ${i + 1}: click to go there, right-click to forget it (key ${i + 1})` : `Empty: click to remember this view (Shift ${i + 1})`}
            onClick={() => { if (v) edit("view-go" + i, (w) => { w.cam = { ...v } }); else edit("view-save" + i, (w) => { w.views[i] = { ...w.cam } }) }}
            onContextMenu={(e) => { e.preventDefault(); if (v) edit("view-forget" + i, (w) => { w.views[i] = null }) }} /> })}
        </div><span className="cl-engrave">Memory</span>
      </div>
      <div className="mt-auto flex shrink-0 flex-col items-center gap-2 max-md:mt-0">
        <div className="flex items-center gap-2">
          <button type="button" className="cl-btn cl-icon-btn" data-tip="Roll a new world (Space)" aria-label="Roll a new world" onClick={() => rollDice()} data-testid="dice"><Dices /></button>
          <button type="button" className="cl-render" onClick={render} data-tip="Render: make the full-size picture and save it" aria-label="Render and save the picture" data-testid="save">
            <span className="text-[11px] font-bold tracking-wide text-[#3a1f05] drop-shadow-[0_1px_0_rgba(255,240,200,.6)]">{rendering === null ? "Render" : `${Math.round(rendering * 100)}%`}</span>
          </button>
          <button type="button" className="cl-btn cl-icon-btn" aria-pressed={wires} data-tip={wires ? "Outlines on: hide the wire outlines" : "Show wire outlines while moving things"} aria-label="Wire outlines" onClick={() => patch({ wires: !wires })}><Grid3x3 /></button>
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label="Render quality">
          {QUALITY.map((q, i) => <button key={q.name} type="button" role="radio" aria-checked={quality === i} className="cl-btn !h-6 !px-1.5 !text-[10.5px]" aria-pressed={quality === i} data-tip={`Quality: ${q.name} (${q.samples} passes)`} onClick={() => patch({ quality: i })}>{q.name}</button>)}
        </div>
      </div>
    </div>
  )
}

// ---------- the menu strip ----------
function MenuStrip({ say, render, attrs, setAttrs }: { say: (s: string) => void; render: () => void; attrs: boolean; setAttrs: (v: boolean) => void }) {
  const name = useApp((s) => s.world.name), canUndo = useApp((s) => s.past.length > 0), canRedo = useApp((s) => s.future.length > 0), timeline = useApp((s) => s.timeline), picked = useApp(selectedThing)
  const M = ({ label, children, w = "w-60" }: { label: string; children: React.ReactNode; w?: string }) => <DropdownMenu><DropdownMenuTrigger render={<button type="button" className="cl-menu" data-testid={`menu-${label.toLowerCase()}`} />}>{label}</DropdownMenuTrigger><DropdownMenuContent className={`${w} max-h-[80dvh]`}>{children}</DropdownMenuContent></DropdownMenu>
  const share = async () => { const u = await shareLink(); try { await navigator.clipboard.writeText(u); notify("Link copied. Whoever opens it gets this world.") } catch { notify("Your link is in the address bar.") } history.replaceState(null, "", u) }
  return (
    <header className="flex h-10 shrink-0 items-center gap-1 px-2.5">
      <span className="cl-logo mr-2 select-none" aria-label="Crycer">Crycer</span>
      <M label="File">
        <DropdownMenuItem onClick={render}>Render and save the picture</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void share()}>Copy a link to this world</DropdownMenuItem>
        <DropdownMenuItem onClick={openEmbed}>Put it on a web page…</DropdownMenuItem><DropdownMenuSeparator />
        <FileItems say={say} />
      </M>
      <M label="Edit">
        <DropdownMenuItem onClick={undo} disabled={!canUndo}>Undo <span className="ml-auto text-[11px] opacity-60">Ctrl Z</span></DropdownMenuItem>
        <DropdownMenuItem onClick={redo} disabled={!canRedo}>Redo <span className="ml-auto text-[11px] opacity-60">Ctrl Shift Z</span></DropdownMenuItem><DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => picked && duplicateThing(picked.id)} disabled={!picked}>Duplicate <span className="ml-auto text-[11px] opacity-60">Ctrl D</span></DropdownMenuItem>
        <DropdownMenuItem onClick={() => picked && removeThing(picked.id)} disabled={!picked}>Delete <span className="ml-auto text-[11px] opacity-60">Del</span></DropdownMenuItem>
        <DropdownMenuItem onClick={() => patch({ dialog: "find" })}>Find anything… <span className="ml-auto text-[11px] opacity-60">/</span></DropdownMenuItem>
      </M>
      <M label="Worlds" w="w-56">
        <DropdownMenuItem onClick={() => rollDice()}>Roll a new world <span className="ml-auto text-[11px] opacity-60">Space</span></DropdownMenuItem><DropdownMenuSeparator />
        {WORLD_GROUPS.map((g) => <DropdownMenuSub key={g}><DropdownMenuSubTrigger>{g === "Classics" ? "Start from" : g}</DropdownMenuSubTrigger><DropdownMenuSubContent className="max-h-[70dvh] w-56">
          {WORLDS.filter((w) => w.group === g).map((w) => <DropdownMenuItem key={w.name} onClick={() => replaceWorld(w.make(), "starter")}>
            <img src={`./presets/${encodeURIComponent(w.name)}.jpg`} alt="" width={40} height={30} loading="lazy" className="h-[30px] w-10 rounded-sm object-cover" /> {w.name}</DropdownMenuItem>)}
        </DropdownMenuSubContent></DropdownMenuSub>)}
      </M>
      <M label="Modes" w="w-72"><DropdownMenuGroup>
        {FEATURES.filter((f) => f.run).map((f) => <DropdownMenuItem key={f.id} onClick={() => f.run!()} className="items-start gap-2.5 py-1.5">{f.icon && <f.icon className="mt-0.5 size-4 shrink-0" />}<span className="flex flex-col"><span className="font-medium">{f.label}</span><span className="text-[11px] leading-snug text-muted-foreground">{f.about}</span></span></DropdownMenuItem>)}
      </DropdownMenuGroup></M>
      <M label="Make">
        <DropdownMenuItem onClick={() => patch({ dialog: "cover" })}>Album cover, flyer, poster…</DropdownMenuItem>
        <DropdownMenuItem onClick={() => patch({ dialog: "loop" })}>A looping video…</DropdownMenuItem>
        <DropdownMenuItem onClick={() => patch({ timeline: !timeline, playing: false })}>{timeline ? "Hide the timeline" : "Animate with a timeline"}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => patch({ sel: { type: "sound" } })}>Move to music…</DropdownMenuItem>
      </M>
      <M label="View">
        <DropdownMenuItem onClick={() => setAttrs(!attrs)}>{attrs ? "Hide the dials panel" : "Show the dials panel"}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => patch({ sel: { type: "camera" } })}>Camera dials</DropdownMenuItem>
        <DropdownMenuItem onClick={() => patch({ sel: { type: "picture" } })}>Picture size and finish</DropdownMenuItem><DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setUiMode("modern")} data-testid="to-modern">Switch to the modern interface</DropdownMenuItem>
      </M>
      <input value={name} onChange={(e) => edit("name", (w) => { w.name = e.target.value.slice(0, 60) })} aria-label="World name" data-tip="The world's name: click to change it" spellCheck={false}
        className="ml-3 h-7 w-44 min-w-0 truncate rounded-md bg-black/25 px-2 text-[12.5px] text-[var(--cl-ink)] shadow-[inset_0_1px_2px_rgba(0,0,0,.6)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--cl-accent)] max-sm:hidden" />
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className="cl-btn cl-icon-btn" onClick={undo} disabled={!canUndo} data-tip="Undo (Ctrl Z)" aria-label="Undo"><Undo2 /></button>
        <button type="button" className="cl-btn cl-icon-btn" onClick={redo} disabled={!canRedo} data-tip="Redo (Ctrl Shift Z)" aria-label="Redo"><Redo2 /></button>
      </div>
    </header>
  )
}

// ---------- the whole desk ----------
type Tab = "create" | "edit" | "sky"
export function ClassicDesk() {
  const status = useApp((s) => s.status), count = useApp((s) => s.world.things.length), sel = useApp((s) => s.sel), picked = useApp(selectedThing), timeline = useApp((s) => s.timeline)
  const [tab, setTab] = React.useState<Tab>("create"), [attrs, setAttrs] = React.useState(false), [note, setNote] = React.useState(""), [rendering, setRendering] = React.useState<number | null>(null)
  const tip = useHoverTip()
  // picking a thing jumps to Edit, as the old programs did; picking the sky or sea opens the dials
  const lastSel = React.useRef(sel)
  React.useEffect(() => {
    const was = lastSel.current; lastSel.current = sel
    if (sel.type === "thing" && (was.type !== "thing" || was.id !== sel.id)) setTab("edit")
    else if (sel.type !== "thing" && sel.type !== was.type && sel.type !== "sky") setAttrs(true)
  }, [sel])
  const render = async () => {
    if (!engine || rendering !== null) return; const w = get().world; setRendering(0)
    try { const c = await engine.still(w, w.frame.w, w.frame.h, Math.max(16, QUALITY[get().quality].samples), setRendering); download(c, `${fileName(w.name)}.png`) }
    catch (e) { notify((e as Error)?.message?.endsWith(".") ? (e as Error).message : "The picture could not be rendered. Try again, or a smaller picture size.") } finally { setRendering(null) }
  }
  const state = status.phase === "done" ? "Sharp" : status.phase === "moving" ? "Moving" : status.phase === "blocks" ? "Blocking in" : `Sharpening ${status.samples}/${status.target}`
  const tabs: { id: Tab; label: string }[] = [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }, { id: "sky", label: "Sky & Fog" }]
  return (
    <div className="cl-root flex h-dvh flex-col gap-2 overflow-hidden p-2" data-testid="classic">
      <MenuStrip say={setNote} render={() => void render()} attrs={attrs} setAttrs={setAttrs} />
      <div className="flex min-h-0 flex-1 gap-2 max-md:flex-col-reverse">
        <ControlColumn rendering={rendering} render={() => void render()} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="cl-slab shrink-0 overflow-hidden">
            <div className="flex items-end gap-1 px-3 pt-1.5" role="tablist" aria-label="Palettes">
              {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="cl-tab" onClick={() => setTab(t.id)} data-tip={`${t.label} palette`} data-testid={`tab-${t.id}`}>{t.label}</button>)}
              <span className="ml-auto pb-1.5 text-[11px] text-[var(--cl-ink-faint)] max-sm:hidden">{picked ? `Selected: ${picked.name}` : ""}</span>
            </div>
            <div className="cl-tray mx-2 mb-2 min-h-[78px]" role="tabpanel">
              {tab === "create" && <CreatePalette />}
              {tab === "edit" && <EditPalette attrs={attrs} setAttrs={setAttrs} />}
              {tab === "sky" && <SkyPalette />}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            <div className="cl-window flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"><Viewport classic />{timeline && <React.Suspense fallback={null}><Timeline /></React.Suspense>}</div>
            {attrs && <div className="cl-attrs relative w-[19.5rem] shrink-0 max-lg:absolute max-lg:inset-y-24 max-lg:right-3 max-lg:z-30 max-lg:w-[min(19.5rem,calc(100vw-1.5rem))]">
              <button type="button" className="absolute top-2 right-2 z-10 grid size-6 place-items-center rounded-md text-[var(--cl-ink-dim)] hover:bg-black/30" onClick={() => setAttrs(false)} aria-label="Close the dials" data-tip="Close the dials"><X className="size-4" /></button>
              <Inspector />
            </div>}
          </div>
        </div>
      </div>
      <footer className="cl-slab flex h-8 shrink-0 items-center gap-3 px-3" aria-live="polite">
        <span className="cl-tray flex h-5 min-w-0 flex-1 items-center truncate px-2 cl-info" data-testid="info-line">{note || tip || (picked ? `${picked.name} · ${KIND_LABEL[picked.kind] ?? picked.kind} · drag it in the picture, Alt-drag to lift` : "Drag the picture to look around · drag the sun · double-click to focus")}</span>
        <span className="cl-info shrink-0 tabular-nums max-sm:hidden">Objects {count}/{MAX_THINGS}</span>
        <span className="cl-info shrink-0 tabular-nums" data-testid="status">{state}</span>
      </footer>
    </div>
  )
}
