import { inject, reactive } from 'vue';
import BlockDefinitionManager from '../services/entry_definition/BlockDefinitionManager.js';

export function useEntryDefinition() {
  const service = inject('entryDefinitionService');

  const localBlockDefinitions = reactive(
    new BlockDefinitionManager(structuredClone(service.getBlockDefinitions()))
  );

  async function saveBlockDefinitions() {
    service.setBlockDefinitions(localBlockDefinitions.getBlockDefinitions());
    await service.saveBlockDefinitions();
  }

  return {
    localBlockDefinitions,
    saveBlockDefinitions,
    ctrlTypeOptions: BlockDefinitionManager.CTRL_TYPE_OPTIONS,
    dataTypeOptions: BlockDefinitionManager.DATA_TYPE_OPTIONS,
  };
}
