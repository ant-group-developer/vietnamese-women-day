export function youtubeId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,})/)
  return m ? m[1] : url.trim()
}

export function youtubeEmbed(url: string, autoplay = true): string {
  return `https://www.youtube.com/embed/${youtubeId(url)}?autoplay=${autoplay ? 1 : 0}&rel=0&playsinline=1`
}
