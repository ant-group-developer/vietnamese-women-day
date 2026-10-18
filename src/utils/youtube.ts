export function youtubeId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,})/)
  return m ? m[1] : url.trim()
}

export function youtubeEmbed(url: string, autoplay = true): string {
  const id = youtubeId(url)
  // Phát một lần, không lặp lại; vq=hd1080 là gợi ý chất lượng, YouTube có thể bỏ qua
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0&playsinline=1&vq=hd1080`
}
