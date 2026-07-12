<template>
  <div class="setting-output-param">
    <div class="main-header">{{ title }}</div>
    <div class="main-body">
      <LabeledComboBox
        label="Data Type"
        :value="param.dataType"
        :items="dataTypeOptions"
        @update:value="onUpdate('dataType', $event)" />
      <LabeledTextBox
        label="Comment"
        :value="param.comment"
        @update:value="onUpdate('comment', $event)" />
    </div>
  </div>
</template>

<script>
import LabeledComboBox from './LabeledComboBox.vue';
import LabeledTextBox  from './LabeledTextBox.vue';

export default {
  name: 'SettingOutputParam',
  components: { LabeledComboBox, LabeledTextBox },
  props: {
    title:           { type: String, required: true },
    param:           { type: Object, required: true },
    dataTypeOptions: { type: Map,    required: true },
  },
  emits: ['update'],
  setup(_, { emit }) {
    function onUpdate(field, value) {
      emit('update', field, value);
    }

    return { onUpdate };
  }
}
</script>

<style scoped>
.setting-output-param {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  border: var(--base-outline-border);
  font-size: 12px;
  overflow: hidden;
}

.main-header {
  padding: 4px 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #777;
  border-bottom: var(--base-outline-border);
  user-select: none;
  white-space: nowrap;
}

.main-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  overflow-y: auto;
}
</style>
