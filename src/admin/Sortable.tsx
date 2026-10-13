import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { idOf } from './sortableIds'

/** Props gắn vào tay nắm kéo. */
export type HandleProps = HTMLAttributes<HTMLElement>

interface SortableListProps<T extends object> {
  items: T[]
  /** Mặc định dùng idOf(); danh sách có sẵn id (vd: bài nhạc) thì truyền vào. */
  getId?: (item: T) => string
  /** 'list' = dọc, 'grid' = lưới. */
  layout?: 'list' | 'grid'
  onMove: (from: number, to: number) => void
  className?: string
  as?: 'ol' | 'div'
  children: (item: T, index: number, handle: HandleProps, dragging: boolean) => ReactNode
  itemClassName?: string
}

export function SortableList<T extends object>({
  items,
  getId = idOf,
  layout = 'list',
  onMove,
  className,
  as: Tag = 'div',
  itemClassName,
  children,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const itemIds = items.map(getId)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = itemIds.indexOf(String(active.id))
    const to = itemIds.indexOf(String(over.id))
    if (from >= 0 && to >= 0) onMove(from, to)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={itemIds} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <Tag className={className}>
          {items.map((item, i) => (
            <SortableItem key={itemIds[i]} id={itemIds[i]} as={Tag === 'ol' ? 'li' : 'div'} className={itemClassName}>
              {(handle, dragging) => children(item, i, handle, dragging)}
            </SortableItem>
          ))}
        </Tag>
      </SortableContext>
    </DndContext>
  )
}

interface SortableItemProps {
  id: string
  as: 'li' | 'div'
  className?: string
  children: (handle: HandleProps, dragging: boolean) => ReactNode
}

function SortableItem({ id, as: Tag, className, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
    position: 'relative',
  }
  const handle = { ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps
  return (
    <Tag ref={setNodeRef} style={style} className={`${className ?? ''}${isDragging ? ' dragging' : ''}`}>
      {children(handle, isDragging)}
    </Tag>
  )
}

/** Tay nắm kéo ⠿. */
export function DragHandle({ handle, title = 'Kéo để đổi thứ tự' }: { handle: HandleProps; title?: string }) {
  return (
    <button type="button" className="drag-handle" title={title} aria-label={title} {...handle}>
      ⠿
    </button>
  )
}
