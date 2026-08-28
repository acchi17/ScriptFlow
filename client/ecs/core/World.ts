import { ComponentStore } from './ComponentStrore';
import { generateUUID } from './Entity';
import type { EntityId } from './Entity';
import type { EntryInfoComponent } from '../components/EntryInfoComponent';
import type { EntryHierarchyComponent } from '../components/EntryHierarchyComponent';
import type { EntryParamComponent } from '../components/EntryParamComponent';
import type { EntryConnectionComponent } from '../components/EntryConnectionComponent';
import type { EntryLayoutComponent } from '../components/EntryLayoutComponent';
import type { EntryOrderComponent } from '../components/EntryOrderComponent';

type StoreName = 'entryInfos' | 'hierarchies' | 'inputParams' | 'outputParams' | 'connections' | 'layouts' | 'orders';

export class World {
  readonly entryInfos = new ComponentStore<EntryInfoComponent>();
  readonly hierarchies = new ComponentStore<EntryHierarchyComponent>();
  readonly inputParams = new ComponentStore<EntryParamComponent>();
  readonly outputParams = new ComponentStore<EntryParamComponent>();
  readonly connections = new ComponentStore<EntryConnectionComponent>();
  readonly layouts = new ComponentStore<EntryLayoutComponent>();
  readonly orders = new ComponentStore<EntryOrderComponent>();
  private readonly _liveIds = new Set<EntityId>();

  getStore<K extends StoreName>(key: K): World[K] {
    return this[key];
  }

  spawn(id?: EntityId | null): EntityId {
    const entityId = id || generateUUID();
    this._liveIds.add(entityId);
    return entityId;
  }

  despawn(id: EntityId): void {
    this._liveIds.delete(id);
    this.entryInfos.remove(id);
    this.hierarchies.remove(id);
    this.inputParams.remove(id);
    this.outputParams.remove(id);
    this.connections.remove(id);
    this.layouts.remove(id);
    this.orders.remove(id);
  }

  isAlive(id: EntityId): boolean {
    return this._liveIds.has(id);
  }
}
