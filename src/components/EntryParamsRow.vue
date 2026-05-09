<template>
  <div class="entry-params-row">
    <div v-if="!isConnectingTgt" class="param-toggle">
      <button
        class="param-toggle-btn"
        :class="{ active: paramCategory === 'input' }"
        @click.stop="paramCategory = 'input'"
      >In</button>
      <button
        class="param-toggle-btn"
        :class="{ active: paramCategory === 'output' }"
        @click.stop="paramCategory = 'output'"
      >Out</button>
    </div>
    <div class="param-badges">
      <EntryParamItem
        v-for="param in paramItems"
        :key="param.name"
        :entry-id="entryId"
        :param-name="param.name"
        :param-category="param.category"
        :param-type="param.type"
        :is-param-type-visible="false"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, inject } from 'vue'
import EntryParamItem from './EntryParamItem.vue'
import { useSystemState } from '../composables/useSystemState'

export default {
  name: 'EntryParamsRow',

  components: { EntryParamItem },

  props: {
    entryId: {
      type: String,
      required: true
    },
    isConnectingTgt: {
      type: Boolean,
      required: true
    }
  },

  setup(props) {
    const entryParamManager = inject('entryParamManager')
    const { getConnectingSource } = useSystemState()

    const paramCategory = ref('input')

    const paramCategoryDyn = computed(() => {
      if (!props.isConnectingTgt) return paramCategory.value
      return getConnectingSource.value?.paramCategory === 'output' ? 'input' : 'output'
    })

    const paramItems = computed(() => {
      const category = paramCategoryDyn.value
      const types = category === 'input'
        ? entryParamManager.getInputParamTypes(props.entryId)
        : entryParamManager.getOutputParamTypes(props.entryId)
      return Object.entries(types).map(([name, type]) => ({ name, type, category }))
    })

    return {
      paramCategory,
      paramItems,
    }
  }
}
</script>

<style scoped>
.entry-params-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.param-toggle {
  display: flex;
  align-items: center;
}

.param-toggle-btn {
  font-size: var(--param-toggle-font-size);
  padding: 2px 5px;
  line-height: 1.4;
  border: var(--param-toggle-border);
  cursor: pointer;
}

.param-toggle-btn.active {
  color: var(--param-toggle-light-color);
  background: var(--param-toggle-dark-color);
}

.param-toggle-btn:first-child {
  border-radius: 4px 0 0 4px;
}

.param-toggle-btn:last-child {
  border-radius: 0 4px 4px 0;
  border-left: none;
}

.param-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
