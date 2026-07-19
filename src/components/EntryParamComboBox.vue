<template>
  <div class="entry-param-combo-box">
    <EntryParamItem
      :entry-id="entryId"
      :param-name="paramDef.name"
      :param-category="paramCategory"
      :param-type="paramDef.dataType"
      :is-param-type-visible="true"
      :is-param-link-visible="true"
    />
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
import EntryParamItem from './EntryParamItem.vue'

export default {
  name: 'EntryParamComboBox',

  components: { EntryParamItem },

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
  display: flex;
  align-items: center;
  gap: 30px;
}

.entry-param-combo-box-input {
  flex: 1;
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
