import { inject, reactive } from 'vue';

export function useEntryDefinition() {
  const service = inject('entryDefinitionService');

  const localDefs = reactive(service.getBlockDefinitions());

  function saveBlockDefinitions() {
    service.updateBlockDefinition(localDefs.blockDefinitions);
  }

  return { localDefs, saveBlockDefinitions };
}
