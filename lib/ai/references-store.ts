import fs from 'fs'
import path from 'path'

// Onde os PDFs ficam salvos localmente
const REFS_DIR = path.join(process.cwd(), 'lib', 'ai', 'diet-references')
const META_FILE = path.join(process.cwd(), 'lib', 'ai', 'references-meta.json')

export interface ReferenceFile {
  id: string
  name: string           // nome original do arquivo
  filename: string       // nome no disco
  geminiUri: string | null  // URI no Gemini Files API
  uploadedAt: string
  expiresAt: string | null  // URIs do Gemini expiram em 48h
}

function ensureDir() {
  if (!fs.existsSync(REFS_DIR)) fs.mkdirSync(REFS_DIR, { recursive: true })
}

export function loadMeta(): ReferenceFile[] {
  if (!fs.existsSync(META_FILE)) return []
  return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'))
}

export function saveMeta(refs: ReferenceFile[]) {
  fs.writeFileSync(META_FILE, JSON.stringify(refs, null, 2))
}

export function addReference(ref: ReferenceFile) {
  const refs = loadMeta()
  refs.unshift(ref)
  saveMeta(refs)
}

export function removeReference(id: string) {
  const refs = loadMeta().filter(r => r.id !== id)
  saveMeta(refs)
  // Remove o arquivo PDF do disco
  const ref = loadMeta().find(r => r.id === id)
  if (ref) {
    const filePath = path.join(REFS_DIR, ref.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
}

export function savePdfToDisk(id: string, buffer: Buffer, filename: string): string {
  ensureDir()
  const safeFilename = `${id}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  fs.writeFileSync(path.join(REFS_DIR, safeFilename), buffer)
  return safeFilename
}

export function readPdfFromDisk(filename: string): Buffer | null {
  const filePath = path.join(REFS_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath)
}

export function isUriValid(ref: ReferenceFile): boolean {
  if (!ref.geminiUri || !ref.expiresAt) return false
  return new Date(ref.expiresAt) > new Date()
}

export function updateUri(id: string, uri: string) {
  const refs = loadMeta()
  const idx = refs.findIndex(r => r.id === id)
  if (idx >= 0) {
    refs[idx].geminiUri = uri
    // URIs do Gemini expiram em 47h (margem de 1h)
    const expires = new Date()
    expires.setHours(expires.getHours() + 47)
    refs[idx].expiresAt = expires.toISOString()
    saveMeta(refs)
  }
}
