<template>
  <div class="entry-param-check-edit">
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
      type="checkbox"
      class="check-edit-input"
      :checked="value"
      :disabled="disabled"
      @change="$emit('update:value', $event.target.checked)"
    />
  </div>
</template>

<script>
import EntryParamBadge from './EntryParamBadge.vue'

export default {
  name: 'EntryParamCheckEdit',

  components: { EntryParamBadge },

  props: {
    entryId:       { type: String,  required: true },
    paramCategory: { type: String,  required: true },
    paramDef:      { type: Object,  required: true },
    value:         { type: Boolean, default: false },
    disabled:      { type: Boolean, default: false }
  },

  emits: ['update:value']
}
</script>

<style scoped>
.entry-param-check-edit {
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

.check-edit-input {
  width: 16px;
  height: 16px;
}
</style>
