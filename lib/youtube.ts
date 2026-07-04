// Helpers de YouTube — extração do ID do vídeo e validação do link.
// Aceita os formatos comuns: youtube.com/watch?v=, youtu.be/, /embed/, /shorts/.

const YT_PATTERNS = [
  /youtube\.com\/watch\?[^#]*\bv=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube\.com\/shorts\/([\w-]{11})/,
]

// Retorna o ID de 11 caracteres do vídeo, ou null se não reconhecer.
export function getYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.trim()
  for (const re of YT_PATTERNS) {
    const m = u.match(re)
    if (m) return m[1]
  }
  return null
}

export function isValidYoutubeUrl(url: string | null | undefined): boolean {
  return getYoutubeId(url) !== null
}

// Thumbnail pública do vídeo (não requer API key).
export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}
