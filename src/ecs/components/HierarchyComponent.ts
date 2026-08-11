import type { EntityId } from '../core/Entity'

export interface HierarchyComponent {
  parent: EntityId | null
  children: EntityId[]
}
