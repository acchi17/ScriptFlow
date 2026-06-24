import { inject, reactive } from 'vue';

export function useEntryDefinition() {
  const service = inject('entryDefinitionService');

  const localBlockDefinitions = reactive(service.getBlockDefinitionManager());

  async function saveBlockDefinitions() {
    service.setBlockDefinitions(localBlockDefinitions.getBlockDefinitions());
    await service.saveBlockDefinitions();
  }

  return { localBlockDefinitions, saveBlockDefinitions };
}
