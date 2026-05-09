const CLOUD_NAME = 'dehjwifww'
const UPLOAD_PRESET = 'chronicler'

export const AVATAR_MAX_BYTES = 500 * 1024        // 500KB
export const BATTLE_IMAGE_MAX_BYTES = 5 * 1024 * 1024  // 5MB
export const BATTLE_IMAGE_MAX_COUNT = 5

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const body = await res.json(); detail = body.error?.message ?? detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  const data = await res.json()
  return data.secure_url as string
}
