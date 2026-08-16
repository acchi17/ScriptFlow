/**
 * Shared entry-type predicates, read directly from the ECS world's entryTypes store.
 * Single source of truth for 'container'/'block' type checks, reused by EntryManager
 * and EntryHierarchyHandler so the check is never duplicated between them.
 */

export function isContainerType(world, entryId) {
  return world.entryTypes.get(entryId)?.type === 'container';
}

export function isBlockType(world, entryId) {
  return world.entryTypes.get(entryId)?.type === 'block';
}
