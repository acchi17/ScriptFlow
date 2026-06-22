import { inject, reactive } from 'vue';

export function useEntryDefinition() {
  const service = inject('entryDefinitionService');

  const localDefs = reactive(service.getBlockDefinition());

  function saveBlockDefinitions() {
    service.updateBlockDefinition(localDefs.blockDefinitions);
  }

  return { localDefs, saveBlockDefinitions };
}
