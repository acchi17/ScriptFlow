<template>
  <div class="block-params-setting">
    <div class="param-names" :style="{ flex: '0 0 40%' }">
      <SettingListItem :style="{ flex: 5 }"
        :title="`Input Parameters — ${blockName}`"
        :items="inputParamNames"
        :selected-item="selectedInputParam"
        @update:selected-item="onSelectInput"
        @move-up="onMoveUp('input', $event)"
        @move-down="onMoveDown('input', $event)"
        @add="onAdd('input', $event)"
        @rename="(old, nw) => onRename('input', old, nw)"
        @delete="onDelete('input', $event)"
      />
      <SettingListItem :style="{ flex: 5 }"
        :title="`Output Parameters — ${blockName}`"
        :items="outputParamNames"
        :selected-item="selectedOutputParam"
        @update:selected-item="onSelectOutput"
        @move-up="onMoveUp('output', $event)"
        @move-down="onMoveDown('output', $event)"
        @add="onAdd('output', $event)"
        @rename="(old, nw) => onRename('output', old, nw)"
        @delete="onDelete('output', $event)"
      />
    </div>
    <div class="param-editor" :style="{ flex: '0 0 60%' }">
      <SettingParamItem
        v-if="selectedParam"
        :param="selectedParam"
        @update="onUpdateParam"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, inject } from 'vue';
import SettingListItem from './SettingListItem.vue';
import SettingParamItem from './SettingParamItem.vue';

export default {
  name: 'BlockParamsSetting',
  components: { SettingListItem, SettingParamItem },
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

    const selectedPrmType = ref(null);
    const selectedParamName = ref(null);

    const selectedInputParam = computed(() =>
      selectedPrmType.value === 'input' ? selectedParamName.value : null
    );
    const selectedOutputParam = computed(() =>
      selectedPrmType.value === 'output' ? selectedParamName.value : null
    );

    const selectedParam = computed(() => {
      if (!selectedPrmType.value || !selectedParamName.value) return null;
      const list = selectedPrmType.value === 'input' ? inputParams.value : outputParams.value;
      return list.find(p => p.name === selectedParamName.value) ?? null;
    });

    function onSelectInput(name) {
      selectedPrmType.value = 'input';
      selectedParamName.value = name;
    }
    function onSelectOutput(name) {
      selectedPrmType.value = 'output';
      selectedParamName.value = name;
    }

    function mutate(fn) {
      fn();
      bumpRefresh();
      emit('change');
    }

    function onAdd(prmType, insertIndex) {
      mutate(() => {
        const name = entryDefinitionService.addParam(props.blockName, prmType, insertIndex);
        if (name) {
          selectedPrmType.value = prmType;
          selectedParamName.value = name;
        }
      });
    }

    function onDelete(prmType, paramName) {
      mutate(() => {
        entryDefinitionService.removeParam(props.blockName, prmType, paramName);
        if (selectedPrmType.value === prmType && selectedParamName.value === paramName) {
          selectedPrmType.value = null;
          selectedParamName.value = null;
        }
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
          if (selectedPrmType.value === prmType && selectedParamName.value === oldName) {
            selectedParamName.value = newName.trim();
          }
        }
      });
    }

    function onUpdateParam(field, value) {
      mutate(() => entryDefinitionService.updateParam(
        props.blockName, selectedPrmType.value, selectedParamName.value, { [field]: value }
      ));
    }

    return {
      inputParamNames,
      outputParamNames,
      selectedInputParam,
      selectedOutputParam,
      selectedParam,
      onSelectInput,
      onSelectOutput,
      onAdd,
      onDelete,
      onMoveUp,
      onMoveDown,
      onRename,
      onUpdateParam,
    };
  }
}
</script>

<style scoped>
.block-params-setting {
  display: flex;
  gap: 8px;
  padding: 8px;
}

.param-names {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
