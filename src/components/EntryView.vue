<template>
  <div class="entry-view" @click.stop>
    <div v-if="selectedEntryId">
      <div class="entry-header">{{ entryName }}</div>
      <div class="section-divider" />
      <div v-if="inputParamDefs.length > 0 || outputParamDefs.length > 0" class="param-grid">
        <template v-if="inputParamDefs.length > 0">
          <div class="entry-param-header">Input</div>
          <template v-for="paramDef in inputParamDefs" :key="paramDef.name">
            <component
              :is="resolveComponent(paramDef)"
              :entry-id="selectedEntryId"
              param-category="input"
              :param-def="paramDef"
              :value="localInputParams[paramDef.name]"
              @update:value="onParamChange(paramDef.name, $event)"
            />
          </template>
        </template>
        <template v-if="outputParamDefs.length > 0">
          <div class="entry-param-header">Output</div>
          <template v-for="paramDef in outputParamDefs" :key="paramDef.name">
            <EntryParamTextBox
              :entry-id="selectedEntryId"
              param-category="output"
              :param-def="paramDef"
              :value="toEmptyIfNull(localOutputParams[paramDef.name])"
              :disabled="true"
            />
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, inject, ref, watch } from 'vue'
import { useSystemState } from '../composables/useSystemState'
import EntryParamSpinEdit from './EntryParamSpinEdit.vue'
import EntryParamCheckEdit from './EntryParamCheckEdit.vue'
import EntryParamComboBox from './EntryParamComboBox.vue'
import EntryParamTextBox from './EntryParamTextBox.vue'
import { toEmptyIfNull } from '../utils/common.js'

const CTRL_TYPE_COMPONENTS = {
  spinner: EntryParamSpinEdit,
  combo_box: EntryParamComboBox,
  check_box: EntryParamCheckEdit,
  text_box: EntryParamTextBox,
}

export default {
  name: 'EntryView',
  components: { EntryParamSpinEdit, EntryParamCheckEdit, EntryParamComboBox, EntryParamTextBox },

  setup() {
    const { getSelectedEntryId: selectedEntryId } = useSystemState()
    const entryManager = inject('entryManager')
    const entryDefinitionService = inject('entryDefinitionService')
    const resolveComponent = (paramDef) => CTRL_TYPE_COMPONENTS[paramDef.ctrlType]

    const entryName = computed(() => {
      return entryManager.getEntryName(selectedEntryId.value)
    })

    // Input parameter definitions from the block or container definition
    const inputParamDefs = computed(() => {
      const id = selectedEntryId.value
      if (entryManager.isBlock(id)) {
        const blockDef = entryDefinitionService.getBlockDefinition(entryName.value)
        return blockDef ? blockDef.parameters.input : []
      }
      if (entryManager.isContainer(id)) {
        const containerDef = entryDefinitionService.getContainerDefinition(entryName.value)
        return containerDef ? containerDef.parameters.input : []
      }
      return []
    })

    // Output parameter definitions from block definition (empty for containers)
    const outputParamDefs = computed(() => {
      if (!entryManager.isBlock(selectedEntryId.value)) return []
      const blockDef = entryDefinitionService.getBlockDefinition(entryName.value)
      return blockDef ? blockDef.parameters.output : []
    })

    // Local copy of input param values for reactive display
    const localInputParams = ref({})

    // Depends on outputParamsTick so this re-runs when output param values change during
    // execution, since the underlying ECS store itself isn't deep-reactive
    const localOutputParams = computed(() => {
      entryManager.paramHandler.outputParamsTick.value
      const id = selectedEntryId.value
      return id ? entryManager.paramHandler.getOutputParamValues(id) : {}
    })

    // Reload local input params when selected entry changes
    watch(selectedEntryId, (id) => {
      localInputParams.value = id ? { ...entryManager.paramHandler.getInputParamValues(id) } : {}
    }, { immediate: true })

    const onParamChange = (paramName, value) => {
      const id = selectedEntryId.value
      if (!id) return
      localInputParams.value[paramName] = value
      entryManager.paramHandler.setInputParam(id, paramName, value)
    }

    return {
      selectedEntryId,
      entryName,
      inputParamDefs,
      outputParamDefs,
      localInputParams,
      localOutputParams,
      onParamChange,
      resolveComponent,
      toEmptyIfNull,
    }
  }
}
</script>

<style scoped>
.entry-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.entry-header {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  padding-bottom: 10px;
}

.section-divider {
  height: 1px;
  background-color: #ddd;
}

.entry-param-header {
  font-size: 14px;
  color: #333;
  padding: 4px 0px;
  grid-column: 1 / -1;
}

.param-grid {
  display: grid;
  grid-template-columns: auto 120px;
  column-gap: 30px;
  row-gap: 10px;
  align-items: center;
  justify-items: start;
  padding: 10px;
}
</style>
