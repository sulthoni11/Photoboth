import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9226
const DOWNLOADS = 'D:/Project/Photoboth/.preview/dl'
rmSync(DOWNLOADS, { recursive: true, force: true })
mkdirSync(DOWNLOADS, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=1280,1000',
  'http://localhost:5174/studio',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let page
for (let i = 0; i < 50 && !page; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    page = list.find((t) => t.type === 'page' && t.url.includes('studio'))
  } catch {}
  if (!page) await sleep(300)
}
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => { ws.onopen = r })
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable')
await send('Page.enable')
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS })
await sleep(2600)

console.log('support:', await evaluate(`JSON.stringify({ media: typeof MediaRecorder, mp4: MediaRecorder.isTypeSupported('video/mp4'), webm: MediaRecorder.isTypeSupported('video/webm;codecs=vp8') })`))

console.log('camera:', await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Nyalakan kamera/i.test(b.textContent || ''))
    if (!btn) return 'no-button'
    btn.click()
    return 'clicked'
  })()
`))
await sleep(3500)

console.log('ready:', await evaluate(`document.body.innerText.includes('Kamera aktif')`))

// Pilih 1 pose supaya sesi cepat.
console.log('mode1:', await evaluate(`
  (() => {
    const aside = document.querySelector('aside')
    const btn = [...aside.querySelectorAll('button')].find((b) => b.textContent.trim() === '1')
    if (!btn) return 'no-mode'
    btn.click()
    return 'ok'
  })()
`))
await sleep(600)

console.log('start:', await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Mulai ambil 1 pose/i.test(b.textContent || ''))
    if (!btn) return [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 20)
    btn.click()
    return 'started'
  })()
`))

// Tunggu sampai masuk tahap editor (maks 30 detik).
let stage = false
for (let i = 0; i < 60 && !stage; i++) {
  await sleep(700)
  stage = await evaluate(`document.body.innerText.includes('Susun strip')`)
}
console.log('editor stage:', stage)

await sleep(1500)

const liveState = await evaluate(`
  (() => {
    const badges = [...document.querySelectorAll('span')].filter((s) => s.textContent.trim() === 'LIVE')
    return { badges: badges.length, text: document.body.innerText.includes('Unduh Live') }
  })()
`)
console.log('live badges:', JSON.stringify(liveState))

// Buka thumbnail → panel bandingkan → putar live.
console.log('thumb:', await evaluate(`
  (() => {
    const btn = document.querySelector('button[aria-label^="Bandingkan sebelum"]')
    if (!btn) return 'no-thumb'
    btn.click()
    return 'clicked'
  })()
`))
await sleep(800)
console.log('play btn:', await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Putar live photo/i.test(b.textContent || ''))
    if (!btn) return 'no-play'
    btn.click()
    return 'clicked'
  })()
`))
await sleep(2500)

console.log('video:', await evaluate(`
  (() => {
    const v = document.querySelector('[role="dialog"] video')
    if (!v) return 'no-video'
    return JSON.stringify({ src: v.src.slice(0, 30), ready: v.readyState, duration: Math.round(v.duration * 100) / 100, time: Math.round(v.currentTime * 100) / 100, paused: v.paused, w: v.videoWidth, h: v.videoHeight })
  })()
`))

const shot = await send('Page.captureScreenshot', { format: 'png' })
const fs = await import('node:fs')
fs.writeFileSync('D:/Project/Photoboth/.preview/live-play.png', Buffer.from(shot.result.data, 'base64'))

// Tutup overlay lalu unduh video strip.
await evaluate(`
  (() => {
    const btn = document.querySelector('[role="dialog"] button[aria-label="Tutup pratinjau live"]')
    if (btn) btn.click()
  })()
`)
await sleep(500)
console.log('download:', await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Unduh Live/i.test(b.textContent || ''))
    if (!btn) return 'no-live-button'
    btn.click()
    return 'clicked'
  })()
`))
await sleep(12000)

const files = readdirSync(DOWNLOADS).map((name) => ({ name, size: statSync(`${DOWNLOADS}/${name}`).size }))
console.log('files:', JSON.stringify(files))

ws.close()
chrome.kill()
process.exit(0)
