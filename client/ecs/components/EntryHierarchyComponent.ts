import type { EntityId } from '../core/Entity'

export interface EntryHierarchyComponent {
  parent: EntityId | null
  children: EntityId[] | null
}
