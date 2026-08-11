<template>
  <div class="entry-view" @click.stop>
    <div v-if="selectedEntry">
      <div class="entry-header">{{ entryName }}</div>
      <div class="section-divider" />
      <div v-if="inputParamDefs.length > 0 || outputParamDefs.length > 0" class="param-grid">
        <template v-if="inputParamDefs.length > 0">
          <div class="entry-param-header">Input</div>
          <template v-for="paramDef in inputParamDefs" :key="paramDef.name">
            <component
              :is="resolveComponent(paramDef)"
              :entry-id="selectedEntry.id"
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
              :entry-id="selectedEntry.id"
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
import { computed, ref, watch } from 'vue'
import { useSystemState } from '../composables/useSystemState'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useEntryDefinition } from '../composables/useEntryDefinition'
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
    const { getSelectedEntryId } = useSystemState()
    const { getEntry, getEntryName, getInputParams, getOutputParams, setInputParam, isBlock } = useEntryOperation()
    const { getBlockDefinition } = useEntryDefinition()
    const resolveComponent = (paramDef) => CTRL_TYPE_COMPONENTS[paramDef.ctrlType]

    const selectedIdRef = getSelectedEntryId

    const selectedEntry = computed(() => {
      if (!selectedIdRef.value) return null
      return getEntry(selectedIdRef.value)
    })

    const entryName = computed(() => {
      return selectedEntry.value ? getEntryName(selectedEntry.value.id) : null
    })

    // Input parameter definitions from block definition (empty for containers)
    const inputParamDefs = computed(() => {
      if (!selectedEntry.value || !isBlock(selectedEntry.value.id)) return []
      const blockDef = getBlockDefinition(entryName.value)
      return blockDef ? blockDef.parameters.input : []
    })

    // Output parameter definitions from block definition (empty for containers)
    const outputParamDefs = computed(() => {
      if (!selectedEntry.value || !isBlock(selectedEntry.value.id)) return []
      const blockDef = getBlockDefinition(entryName.value)
      return blockDef ? blockDef.parameters.output : []
    })

    // Local copy of input param values for reactive display
    const localInputParams = ref({})

    // Computed output params reads directly from the reactive EntryParamManager map,
    // so it updates automatically when values change during execution
    const localOutputParams = computed(() => {
      const id = selectedIdRef.value
      return id ? getOutputParams(id) : {}
    })

    // Reload local input params when selected entry changes
    watch(selectedIdRef, (id) => {
      localInputParams.value = id ? { ...getInputParams(id) } : {}
    }, { immediate: true })

    const onParamChange = (paramName, value) => {
      const id = selectedIdRef.value
      if (!id) return
      localInputParams.value[paramName] = value
      setInputParam(id, paramName, value)
    }

    return {
      selectedEntry,
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
