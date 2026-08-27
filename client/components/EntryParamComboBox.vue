<template>
  <div class="entry-param-combo-box">
    <div class="param-badge-group">
      <EntryParamBadge
        :entry-id="entryId"
        :param-name="paramDef.name"
        :param-category="paramCategory"
        :param-type="paramDef.dataType"
        :display-mode="1"
      />
      <span class="param-name-label">{{ paramDef.name }}</span>
    </div>
    <select
      class="entry-param-combo-box-input combo-box-input"
      :value="effectiveValue"
      :disabled="disabled"
      @change="$emit('update:value', $event.target.value)"
    >
      <option v-for="item in paramDef.items" :key="item" :value="item">
        {{ item }}
      </option>
    </select>
  </div>
</template>

<script>
import { computed } from 'vue'
import EntryParamBadge from './EntryParamBadge.vue'

export default {
  name: 'EntryParamComboBox',

  components: { EntryParamBadge },

  props: {
    entryId:       { type: String,           required: true },
    paramCategory: { type: String,           required: true },
    paramDef:      { type: Object,           required: true },
    value:         { type: [String, Number], default: null },
    disabled:      { type: Boolean,          default: false }
  },

  emits: ['update:value'],

  setup(props) {
    const effectiveValue = computed(() => {
      if (props.value != null) return props.value
      return props.paramDef.items?.[0] ?? ''
    })

    return { effectiveValue }
  }
}
</script>

<style scoped>
.entry-param-combo-box {
  display: contents;
}

.param-badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-name-label {
  font-size: var(--param-edit-font-size);
  white-space: nowrap;
}

.combo-box-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 16px;
  color: #555;
  border: 1px solid #bbb;
  border-radius: 3px;
}
</style>
