<template>
  <div class="entry-param-text-box">
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
    <input
      type="text"
      class="entry-param-text-box-input text-box-input"
      :value="value"
      :disabled="disabled"
      @change="$emit('update:value', $event.target.value)"
    />
  </div>
</template>

<script>
import EntryParamBadge from './EntryParamBadge.vue'

export default {
  name: 'EntryParamTextBox',

  components: { EntryParamBadge },

  props: {
    entryId:       { type: String,  required: true },
    paramCategory: { type: String,  required: true },
    paramDef:      { type: Object,  required: true },
    value:         { type: String,  default: '' },
    disabled:      { type: Boolean, default: false }
  },

  emits: ['update:value']
}
</script>

<style scoped>
.entry-param-text-box {
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

.text-box-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 16px;
  color: #555;
  border: 1px solid #bbb;
  border-radius: 3px;
}
</style>
