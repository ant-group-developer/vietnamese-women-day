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
