// Client-side image prep: downscale to 1600px on the longest side; JPEG q0.85 (PNG kept for small screenshots).
const MAX_SIDE = 1600
const PNG_KEEP_BYTES = 900_000

function load(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}
const dataUrlBytes = (u: string) => Math.floor((u.length - u.indexOf(',') - 1) * 0.75)

export async function prepareImage(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('unsupported')
  const img = await load(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  if (file.type === 'image/png') {
    ctx.drawImage(img, 0, 0, w, h)
    const png = canvas.toDataURL('image/png')
    if (dataUrlBytes(png) <= PNG_KEEP_BYTES) return png
  }
  ctx.fillStyle = '#fff' // JPEG has no alpha
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}
