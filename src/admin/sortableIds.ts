const ids = new WeakMap<object, string>()
let seq = 0

/** Id ổn định cho mỗi phần tử (chỉ dùng phía admin, không lưu vào cấu hình). */
export function idOf(item: object): string {
  let id = ids.get(item)
  if (!id) ids.set(item, (id = `i${++seq}`))
  return id
}

/** Tạo bản sửa của `item` nhưng giữ nguyên id kéo thả (để ô đang gõ không bị mất focus). */
export function patched<T extends object>(item: T, patch: Partial<T>): T {
  const next = { ...item, ...patch }
  ids.set(next, idOf(item))
  return next
}

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
