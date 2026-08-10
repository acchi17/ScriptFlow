import { ComponentStore } from './ComponentStrore';
import type { EntryTypeComponent } from '../components/EntryTypeComponent';

export class World {
  readonly entryTypes = new ComponentStore<EntryTypeComponent>();
}
