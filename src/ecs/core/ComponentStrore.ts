import type { EntityId } from './Entity';

export class ComponentStore<T> {
  private _store = new Map<EntityId, T>();

  add(entityId: EntityId, component: T): void {
    this._store.set(entityId, component);
  }

  remove(entityId: EntityId): void {
    this._store.delete(entityId);
  }

  get(entityId: EntityId): T | undefined {
    return this._store.get(entityId);
  }

  has(entityId: EntityId): boolean {
    return this._store.has(entityId);
  }

  entries(): IterableIterator<[EntityId, T]> {
    return this._store.entries();
  }
}
