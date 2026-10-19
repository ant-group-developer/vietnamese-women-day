/**
 * Lệnh điều khiển camera từ các nút HUD. CameraRig đọc và áp dụng dần mỗi frame.
 * zoom: số "nấc" (dương = phóng to), rotate: góc quay quanh trục đứng (radian).
 */
export const cameraCmd = { zoom: 0, rotate: 0 }

export function zoomCamera(steps: number) {
  cameraCmd.zoom += steps
}

export function rotateCamera(angle: number) {
  cameraCmd.rotate += angle
}

/** Tour hướng dẫn: camera nhìn vào giữa nhân vật và trạm này để thấy rõ ngôi nhà (-1 = bám nhân vật như thường). */
export const cameraFocus = { station: -1 }

/** Màn hình dọc (điện thoại) hẹp hơn nên lùi camera ra xa để thấy đủ nhà và đường. */
export function portraitZoom(width: number, height: number) {
  const aspect = width / height
  return aspect < 1 ? 1 + (1 - aspect) * 1.1 : 1
}
