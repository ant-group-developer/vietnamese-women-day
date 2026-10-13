import * as THREE from 'three'

export const isMobile =
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))

const tmp = new THREE.Color()

/** Làm sáng (amount > 0) hoặc tối (amount < 0) một màu hex. */
export function shade(hex: string, amount: number): string {
  tmp.set(hex)
  if (amount >= 0) tmp.lerp(new THREE.Color('#ffffff'), amount)
  else tmp.lerp(new THREE.Color('#3a1f2b'), -amount)
  return `#${tmp.getHexString()}`
}

/** Hệ số lerp độc lập framerate. */
export function damp(dt: number, speed: number): number {
  return 1 - Math.exp(-dt * speed)
}
