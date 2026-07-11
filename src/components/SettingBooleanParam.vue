<template>
  <div class="detail-row">
    <span class="detail-label">UI Type</span>
    <select class="detail-select" :value="param.ctrlType"
      @change="onCtrlTypeChange($event.target.value)">
      <option value="check_box">Check Box</option>
    </select>
  </div>
  <LabeledListEdit v-if="param.ctrlType === 'combo_box'"
    label="Items"
    :items="param.items"
    :value="String(param.initial)"
    @update:value="onEditorUpdate('initial', $event)"
    @update:items="onEditorUpdate('items', $event)" />
  <div v-else class="detail-row">
    <span class="detail-label">Initial Value</span>
    <select class="detail-select"
      :value="String(param.initial)"
      @change="onFieldChange('initial', $event.target.value)">
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  </div>
</template>

<script>
import LabeledListEdit from './LabeledListEdit.vue';

export default {
  name: 'SettingBooleanParam',
  components: { LabeledListEdit },
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(_, { emit }) {
    function onCtrlTypeChange(value) {
      emit('update', 'ctrlType', value);
    }

    function onFieldChange(field, rawValue) {
      emit('update', field, rawValue === 'true');
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
</style>
