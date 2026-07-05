<template>
  <div class="detail-row">
    <span class="detail-label">UI Type</span>
    <select class="detail-select" :value="param.ctrlType"
      @change="onCtrlTypeChange($event.target.value)">
      <option value="text_box">Text Box</option>
      <option value="combo_box">Combo Box</option>
    </select>
  </div>
  <SimpleListEditor v-if="param.ctrlType === 'combo_box'"
    :param="param"
    @update="onEditorUpdate" />
  <div v-else class="detail-row">
    <span class="detail-label">Initial Value</span>
    <input class="detail-input" type="text"
      :value="param.default"
      @change="onFieldChange('default', $event.target.value)" />
  </div>
</template>

<script>
import SimpleListEditor from './SimpleListEditor.vue';

export default {
  name: 'SettingStringParam',
  components: { SimpleListEditor },
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(_, { emit }) {
    function onCtrlTypeChange(value) {
      emit('update', 'ctrlType', value);
    }

    function onFieldChange(field, rawValue) {
      emit('update', field, rawValue);
    }

    function onEditorUpdate(field, value) {
      emit('update', field, value);
    }

    return { onCtrlTypeChange, onFieldChange, onEditorUpdate };
  }
}
</script>

<style scoped>
.detail-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.detail-label {
  width: 90px;
  flex-shrink: 0;
  color: #555;
  user-select: none;
}

.detail-select {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: var(--base-outline-border, 1px solid #ccc);
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
}

.detail-input {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: var(--base-outline-border, 1px solid #ccc);
  border-radius: 3px;
  background-color: #fff;
  outline: none;
}
</style>
