import { ComponentStore } from './ComponentStrore';
import type { EntryTypeComponent } from '../components/EntryTypeComponent';
import type { HierarchyComponent } from '../components/HierarchyComponent';

export class World {
  readonly entryTypes = new ComponentStore<EntryTypeComponent>();
  readonly hierarchies = new ComponentStore<HierarchyComponent>();
}
