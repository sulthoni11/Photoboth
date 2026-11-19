import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9227
const DOWNLOADS = 'D:/Project/Photoboth/.preview/dl2'
rmSync(DOWNLOADS, { recursive: true, force: true })
mkdirSync(DOWNLOADS, { recursive: true })

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required', '--window-size=1280,1000',
  'http://localhost:5174/studio'], { stdio: 'ignore' })

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
const logs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.consoleAPICalled') logs.push('console: ' + m.params.args.map((a) => a.value ?? a.description).join(' '))
  if (m.method === 'Runtime.exceptionThrown') logs.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable')
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS })
await sleep(2500)

await evaluate(`[...document.querySelectorAll('button')].find((b) => /Nyalakan kamera/i.test(b.textContent||''))?.click()`)
await sleep(3000)
await evaluate(`[...document.querySelector('aside').querySelectorAll('button')].find((b) => b.textContent.trim() === '1')?.click()`)
await sleep(400)
await evaluate(`[...document.querySelectorAll('button')].find((b) => /Mulai ambil 1 pose/i.test(b.textContent||''))?.click()`)

for (let i = 0; i < 60; i++) {
  await sleep(700)
  if (await evaluate(`document.body.innerText.includes('Susun strip')`)) break
}
await sleep(1200)

// Blob dari recordStripVideo tidak bisa ditangkap lewat folder unduhan headless,
// jadi kita sadap URL.createObjectURL lalu validasi blob yang dihasilkan.
await evaluate(`
  (() => {
    if (window.__hook) return
    window.__hook = true
    window.__blobs = []
    const original = URL.createObjectURL
    URL.createObjectURL = function (blob) {
      try { if (blob && blob.type && blob.type.startsWith('video/')) window.__blobs.push(blob) } catch {}
      return original.call(this, blob)
    }
  })()
`)

console.log('click:', await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Unduh Live/i.test(b.textContent || ''))
    if (!btn) return 'no-btn'
    if (btn.disabled) return 'disabled'
    btn.click()
    return 'clicked'
  })()
`))

let report = null
for (let i = 0; i < 14 && !report; i++) {
  await sleep(2000)
  report = await evaluate(`
    (async () => {
      const blob = (window.__blobs || [])[0]
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      const video = document.createElement('video')
      video.src = url
      video.muted = true
      await new Promise((resolve) => {
        video.onloadeddata = resolve
        video.onerror = resolve
        setTimeout(resolve, 4000)
      })
      return JSON.stringify({ size: blob.size, type: blob.type, duration: Math.round((video.duration || 0) * 100) / 100, w: video.videoWidth, h: video.videoHeight })
    })()
  `)
  const toast = await evaluate(`[...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.textContent.trim()).join(' | ')`)
  console.log(`t=${(i + 1) * 2}s`, 'blob:', report, 'toast:', toast)
}

if (report) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync('D:/Project/Photoboth/.preview/live-editor.png', Buffer.from(shot.result.data, 'base64'))
}

console.log('logs:', JSON.stringify(logs.slice(-8)))
ws.close()
chrome.kill()
process.exit(0)
