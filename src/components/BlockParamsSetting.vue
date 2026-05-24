<template>
  <div class="block-params-setting">
    <BlockParamNameSetting :style="{ flex: 1 }"
      :block-name="blockName"
      :input-param-names="inputParamNames"
      :output-param-names="outputParamNames"
      :selected-input-name="selectedInputName"
      :selected-output-name="selectedOutputName"
      @update:selectedInputName="onSelectInput"
      @update:selectedOutputName="onSelectOutput"
      @move-up="onMoveUp"
      @move-down="onMoveDown"
      @add="onAdd"
      @rename="onRename"
      @delete="onDelete"
    />
    <BlockParamDetailSetting :style="{ flex: 1 }"
      :selected-input-param-def="selectedInputParamDef"
      :selected-output-param-def="selectedOutputParamDef"
      @update-input="onUpdateInputParam"
      @update-output="onUpdateOutputParam"
    />
  </div>
</template>

<script>
import { ref, computed, inject } from 'vue';
import BlockParamNameSetting from './BlockParamNameSetting.vue';
import BlockParamDetailSetting from './BlockParamDetailSetting.vue';

export default {
  name: 'BlockParamsSetting',
  components: { BlockParamNameSetting, BlockParamDetailSetting },
  props: {
    blockName: { type: String, required: true },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const entryDefinitionService = inject('entryDefinitionService');

    const refreshTrigger = ref(0);
    const bumpRefresh = () => { refreshTrigger.value++; };

    const inputParams = computed(() => {
      refreshTrigger.value;
      return [...(entryDefinitionService.blockDefinitions[props.blockName]?.parameters?.input ?? [])];
    });
    const outputParams = computed(() => {
      refreshTrigger.value;
      return [...(entryDefinitionService.blockDefinitions[props.blockName]?.parameters?.output ?? [])];
    });

    const inputParamNames = computed(() => inputParams.value.map(p => p.name));
    const outputParamNames = computed(() => outputParams.value.map(p => p.name));

    const selectedInputName = ref(null);
    const selectedOutputName = ref(null);

    const selectedInputParamDef = computed(() =>
      selectedInputName.value
        ? inputParams.value.find(p => p.name === selectedInputName.value) ?? null
        : null
    );
    const selectedOutputParamDef = computed(() =>
      selectedOutputName.value
        ? outputParams.value.find(p => p.name === selectedOutputName.value) ?? null
        : null
    );

    function onSelectInput(name) { selectedInputName.value = name; }
    function onSelectOutput(name) { selectedOutputName.value = name; }

    function mutate(fn) {
      fn();
      bumpRefresh();
      emit('change');
    }

    function onAdd(prmType, insertIndex) {
      mutate(() => {
        const name = entryDefinitionService.addParam(props.blockName, prmType, insertIndex);
        if (name) {
          if (prmType === 'input') selectedInputName.value = name;
          else selectedOutputName.value = name;
        }
      });
    }

    function onDelete(prmType, paramName) {
      mutate(() => {
        entryDefinitionService.removeParam(props.blockName, prmType, paramName);
        if (prmType === 'input' && selectedInputName.value === paramName) selectedInputName.value = null;
        if (prmType === 'output' && selectedOutputName.value === paramName) selectedOutputName.value = null;
      });
    }

    function onMoveUp(prmType, paramName) {
      mutate(() => entryDefinitionService.moveParamUp(props.blockName, prmType, paramName));
    }

    function onMoveDown(prmType, paramName) {
      mutate(() => entryDefinitionService.moveParamDown(props.blockName, prmType, paramName));
    }

    function onRename(prmType, oldName, newName) {
      mutate(() => {
        if (entryDefinitionService.renameParam(props.blockName, prmType, oldName, newName)) {
          if (prmType === 'input' && selectedInputName.value === oldName) selectedInputName.value = newName.trim();
          if (prmType === 'output' && selectedOutputName.value === oldName) selectedOutputName.value = newName.trim();
        }
      });
    }

    function onUpdateInputParam(field, value) {
      mutate(() => entryDefinitionService.updateParam(
        props.blockName, 'input', selectedInputName.value, { [field]: value }
      ));
    }

    function onUpdateOutputParam(field, value) {
      mutate(() => entryDefinitionService.updateParam(
        props.blockName, 'output', selectedOutputName.value, { [field]: value }
      ));
    }

    return {
      inputParamNames,
      outputParamNames,
      selectedInputName,
      selectedOutputName,
      selectedInputParamDef,
      selectedOutputParamDef,
      onSelectInput,
      onSelectOutput,
      onAdd,
      onDelete,
      onMoveUp,
      onMoveDown,
      onRename,
      onUpdateInputParam,
      onUpdateOutputParam,
    };
  }
}
</script>

<style scoped>
.block-params-setting {
  min-height: 0;
  display: flex;
  gap: 8px;
}
</style>
