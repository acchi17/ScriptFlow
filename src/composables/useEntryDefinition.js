import { inject, reactive } from 'vue';
import BlockDefinitionStore from '../services/entry_definition/BlockDefinitionStore.js';

export function useEntryDefinition() {
  const service = inject('entryDefinitionService');

  const store = new BlockDefinitionStore();
  store.blockCategories = JSON.parse(JSON.stringify(service.blockCategories));
  store.blockDefinitions = JSON.parse(JSON.stringify(service.blockDefinitions));

  const localDefs = reactive(store);

  async function saveBlockDefinitions() {
    // Commit local clone into the service's store in-place (preserves array/object identity).
    const cats = service.blockCategories;
    cats.splice(0, cats.length, ...JSON.parse(JSON.stringify(localDefs.blockCategories)));

    const defs = service.blockDefinitions;
    Object.keys(defs).forEach(k => { delete defs[k]; });
    Object.assign(defs, JSON.parse(JSON.stringify(localDefs.blockDefinitions)));

    await service.saveBlockDefinitions();
  }

  return { localDefs, saveBlockDefinitions };
}
