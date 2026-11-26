// Exercise saved worlds, custom fonts and model replacement in the built editor.
import assert from "node:assert/strict"
import { mkdir, readFile } from "node:fs/promises"
import { browser, serve } from "./serve.mjs"

const server = await serve()
await mkdir("shots", { recursive: true })
let chromium
try {
  chromium = await browser()
  const page = await chromium.newPage({ viewport: { width: 1180, height: 780 } })
  await page.addInitScript(() => { try { localStorage.setItem("crycer:ui", JSON.stringify("modern")) } catch {} }) // these checks drive the modern interface
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(server.url)
  await page.waitForFunction(() => window.__app?.engine?.ok)

  const shelf = () => page.evaluate(() => window.__app.get().saved.map(({ id, code }) => ({ id, code })))
  const add = page.getByTestId("shelf-add")
  await add.click()
  await page.waitForFunction(() => window.__app.get().saved.length === 1)
  const [first] = await shelf()
  await page.evaluate(() => window.__app.edit("variant", w => { w.cam.dist += 2 }))
  await add.click()
  await page.waitForFunction(() => window.__app.get().saved.length === 2)
  const [second, original] = await shelf()
  assert.deepEqual(original, first)
  assert.notEqual(second.id, first.id)
  assert.notEqual(second.code, first.code)
  await page.getByRole("button", { name: /^Replace .* with the current world$/ }).nth(1).click()
  await page.waitForFunction(() => {
    const [a, b] = window.__app.get().saved
    return a.code === b.code
  })
  await page.reload()
  await page.waitForFunction(() => window.__app?.engine?.ok)
  assert.deepEqual(await shelf(), [second, { id: first.id, code: second.code }])

  const bytes = await readFile(new URL("../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2", import.meta.url))
  const fontChecks = await page.evaluate(async bytes => {
    const font = new File([new Uint8Array(bytes)], "letters.woff2", { type: "font/woff2" })
    const first = await window.__text.loadCustomFont(font)
    const depth = window.__app.get().past.length
    const again = await window.__text.loadCustomFont(font)
    return [first, again, window.__app.get().past.length === depth]
  }, Array.from(bytes))
  assert.deepEqual(fontChecks, [true, true, true])

  const modelChecks = await page.evaluate(async () => {
    const store = window.__app
    const snapshot = () => JSON.stringify(store.get().world)
    const load = (name, height) => window.__io.importModel(new File([
      'v 0 0 0\nv 1 0 0\nv 0 ' + height + ' 0\nv 0 0 1\nf 1 3 2\nf 1 2 4\nf 2 3 4\nf 3 1 4'
    ], name + ".obj"))
    const first = await load("First", 1)
    const before = snapshot()
    const second = await load("Second", 2)
    const after = snapshot()
    store.undo()
    const restored = snapshot() === before
    store.redo()
    return [first, second, after !== before, restored, snapshot() === after]
  })
  assert.deepEqual(modelChecks, [true, true, true, true, true])
  assert.deepEqual(errors, [])

  // the classic interface: palettes, adding from the object tray, several imported models side by side, My objects
  const classic = await chromium.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const classicErrors = []
  classic.on("pageerror", error => classicErrors.push(error.message))
  await classic.addInitScript(() => { try { localStorage.setItem("crycer:ui", JSON.stringify("classic")) } catch {} })
  await classic.goto(server.url)
  await classic.waitForFunction(() => window.__app?.engine?.ok)
  await classic.getByTestId("classic").waitFor()
  const things = () => classic.evaluate(() => window.__app.get().world.things.length)
  const before = await things()
  await classic.getByTestId("create-sphere").click()
  assert.equal(await things(), before + 1)
  await classic.getByTestId("palette-edit").waitFor() // picking a new thing opens the Edit palette
  const multi = await classic.evaluate(async () => {
    const load = (name, height) => window.__io.importModel(new File(['v 0 0 0\nv 1 0 0\nv 0 ' + height + ' 0\nv 0 0 1\nf 1 3 2\nf 1 2 4\nf 2 3 4\nf 3 1 4'], name + ".obj"))
    const a = await load("Tetra", 1), b = await load("Spike", 3)
    const w = window.__app.get().world, models = w.things.filter((t) => t.kind === "model")
    return [a, b, models.length, new Set(models.map((t) => t.slot ?? 0)).size, (w.models ?? []).length]
  })
  assert.deepEqual(multi, [true, true, 2, 2, 1])
  await classic.getByTestId("tab-create").click()
  await classic.getByTestId("my-object").first().waitFor()
  assert.equal(await classic.getByTestId("my-object").count(), 2)
  await classic.waitForTimeout(2500)
  await classic.screenshot({ path: "shots/classic-create.png" })
  await classic.getByTestId("tab-sky").click(); await classic.waitForTimeout(800)
  await classic.screenshot({ path: "shots/classic-sky.png" })
  await classic.getByTestId("tab-edit").click(); await classic.waitForTimeout(500)
  await classic.screenshot({ path: "shots/classic-edit.png" })
  await classic.reload(); await classic.waitForFunction(() => window.__app?.engine?.ok)
  await classic.getByTestId("my-object").first().waitFor() // My objects survive a reload
  const phone = await chromium.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await phone.addInitScript(() => { try { localStorage.setItem("crycer:ui", JSON.stringify("classic")) } catch {} })
  await phone.goto(server.url); await phone.waitForFunction(() => window.__app?.engine?.ok); await phone.waitForTimeout(1500)
  await phone.screenshot({ path: "shots/classic-phone.png" })
  assert.deepEqual(classicErrors, [])
  console.log("Passed shelf add, targeted replace and reload, repeat font selection, model undo and redo.")
} finally {
  try { await chromium?.close() } finally { server.close() }
}
