<template>
  <div class="entry-view" @click.stop>
    <div v-if="selectedEntry">
      <div class="entry-header">{{ selectedEntry?.name }}</div>
      <div class="section-divider" />
      <div v-if="inputParamDefs.length > 0 || outputParamDefs.length > 0" class="param-grid">
        <template v-if="inputParamDefs.length > 0">
          <div class="entry-param-header span-all">Input</div>
          <template v-for="paramDef in inputParamDefs" :key="paramDef.name">
            <EntryParamItem
              :entry-id="selectedEntry.id"
              :param-name="paramDef.name"
              :param-category="'input'"
              :param-type="paramDef.dataType"
            />
            <component
              :is="resolveParamComponent(paramDef)"
              :min="paramDef.min"
              :max="paramDef.max"
              :step="paramDef.step"
              :value="localInputParams[paramDef.name]"
              @update:value="onParamChange(paramDef.name, $event)"
            />
          </template>
        </template>
        <template v-if="outputParamDefs.length > 0">
          <div class="entry-param-header span-all">Output</div>
          <template v-for="paramDef in outputParamDefs" :key="paramDef.name">
            <EntryParamItem
              :entry-id="selectedEntry.id"
              :param-name="paramDef.name"
              :param-category="'output'"
              :param-type="paramDef.dataType"
            />
            <component
              :is="resolveParamComponent(paramDef)"
              :min="paramDef.min"
              :max="paramDef.max"
              :step="paramDef.step"
              :value="localOutputParams[paramDef.name]"
              :disabled="true"
            />
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, computed, ref, watch } from 'vue'
import { useSystemState } from '../composables/useSystemState'
import EntryParamItem from './EntryParamItem.vue'
import IntSpinEdit from './IntSpinEdit.vue'
import RealSpinEdit from './RealSpinEdit.vue'
import CheckEdit from './CheckEdit.vue'

export default {
  name: 'EntryView',
  components: { EntryParamItem, IntSpinEdit, RealSpinEdit, CheckEdit },

  setup() {
    const { getSelectedEntryId } = useSystemState()
    const paramComponents = {
      checkbox: CheckEdit,
    }
    const resolveParamComponent = (paramDef) => {
      if (paramDef.ctrlType === 'spinner') {
        return paramDef.dataType === 'real' ? RealSpinEdit : IntSpinEdit
      }
      return paramComponents[paramDef.ctrlType]
    }
    const entryManager = inject('entryManager')
    const entryParamManager = inject('entryParamManager')
    const entryDefinitionService = inject('entryDefinitionService')

    const selectedIdRef = getSelectedEntryId

    const selectedEntry = computed(() => {
      if (!selectedIdRef.value) return null
      return entryManager.getEntry(selectedIdRef.value)
    })

    // Input parameter definitions from block definition (empty for containers)
    const inputParamDefs = computed(() => {
      if (!selectedEntry.value || selectedEntry.value.type !== 'block') return []
      const blockDef = entryDefinitionService.blockDefinitions[selectedEntry.value.name]
      return blockDef ? blockDef.parameters.input : []
    })

    // Output parameter definitions from block definition (empty for containers)
    const outputParamDefs = computed(() => {
      if (!selectedEntry.value || selectedEntry.value.type !== 'block') return []
      const blockDef = entryDefinitionService.blockDefinitions[selectedEntry.value.name]
      return blockDef ? blockDef.parameters.output : []
    })

    // Local copy of input param values for reactive display
    const localInputParams = ref({})

    // Computed output params reads directly from the reactive EntryParamManager map,
    // so it updates automatically when values change during execution
    const localOutputParams = computed(() => {
      const id = selectedIdRef.value
      return id ? entryParamManager.getOutputParams(id) : {}
    })

    // Reload local input params when selected entry changes
    watch(selectedIdRef, (id) => {
      localInputParams.value = id ? { ...entryParamManager.getInputParams(id) } : {}
    }, { immediate: true })

    const onParamChange = (paramName, value) => {
      const id = selectedIdRef.value
      if (!id) return
      localInputParams.value[paramName] = value
      entryParamManager.setInputParam(id, paramName, value)
    }

    return {
      selectedEntry,
      inputParamDefs,
      outputParamDefs,
      localInputParams,
      localOutputParams,
      onParamChange,
      resolveParamComponent,
    }
  }
}
</script>

<style scoped>
.entry-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px;
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
  font-size: 18px;
  color: #333;
  padding: 5px 0px;
}

.param-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 30px;
  row-gap: 10px;
  padding: 10px;
}

.span-all {
  grid-column: 1 / -1;
}
</style>
