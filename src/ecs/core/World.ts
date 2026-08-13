import { ComponentStore } from './ComponentStrore';
import { generateUUID } from './Entity';
import type { EntityId } from './Entity';
import type { EntryTypeComponent } from '../components/EntryTypeComponent';
import type { HierarchyComponent } from '../components/HierarchyComponent';
import type { EntryParamComponent } from '../components/EntryParamComponent';
import type { EntryConnectionComponent } from '../components/EntryConnectionComponent';

export class World {
  readonly entryTypes = new ComponentStore<EntryTypeComponent>();
  readonly hierarchies = new ComponentStore<HierarchyComponent>();
  readonly inputParams = new ComponentStore<EntryParamComponent>();
  readonly outputParams = new ComponentStore<EntryParamComponent>();
  readonly connections = new ComponentStore<EntryConnectionComponent>();
  private readonly _liveIds = new Set<EntityId>();

  spawn(id?: EntityId | null): EntityId {
    const entityId = id || generateUUID();
    this._liveIds.add(entityId);
    return entityId;
  }

  despawn(id: EntityId): void {
    this._liveIds.delete(id);
    this.entryTypes.remove(id);
    this.hierarchies.remove(id);
    this.inputParams.remove(id);
    this.outputParams.remove(id);
    this.connections.remove(id);
  }

  isAlive(id: EntityId): boolean {
    return this._liveIds.has(id);
  }
}
