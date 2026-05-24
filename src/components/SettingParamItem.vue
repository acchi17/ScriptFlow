<template>
  <div class="param-detail">
    <div class="detail-row">
      <span class="detail-label">Data Type</span>
      <select class="detail-select" :value="param.dataType" @change="onFieldChange('dataType', $event.target.value)">
        <option v-for="dt in dataTypeOptions" :key="dt.value" :value="dt.value">{{ dt.label }}</option>
      </select>
    </div>
    <div class="detail-row">
      <span class="detail-label">UI Type</span>
      <select class="detail-select" :value="param.ctrlType" @change="onFieldChange('ctrlType', $event.target.value)">
        <option v-for="ct in ctrlTypeOptions" :key="ct.value" :value="ct.value">{{ ct.label }}</option>
      </select>
    </div>
    <div class="detail-row">
      <span class="detail-label">Initial Value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.default"
        @change="onFieldChange('default', $event.target.value)" />
    </div>
    <div class="detail-row">
      <span class="detail-label">Step Value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.step"
        :disabled="!isSpinner"
        @change="onFieldChange('step', $event.target.value)" />
    </div>
    <div class="detail-row">
      <span class="detail-label">Min value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.min"
        :disabled="!isSpinner"
        @change="onFieldChange('min', $event.target.value)" />
    </div>
    <div class="detail-row">
      <span class="detail-label">Max value</span>
      <input class="detail-input detail-input-num" type="number"
        :value="param.max"
        :disabled="!isSpinner"
        @change="onFieldChange('max', $event.target.value)" />
    </div>
    <div class="detail-row">
      <span class="detail-label">Comment</span>
      <input class="detail-input" type="text"
        :value="param.comment"
        @change="onFieldChange('comment', $event.target.value)" />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

const dataTypeOptions = [
  { value: 'integer', label: 'Integer' },
  { value: 'real',    label: 'Real' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'string',  label: 'String' },
];

const ctrlTypeOptions = [
  { value: 'spinner',   label: 'Spin' },
  { value: 'check_box', label: 'Check' },
  { value: 'combo_box', label: 'Combo' },
  { value: 'text_box',  label: 'Text' },
];

const numericFields = new Set(['default', 'step', 'min', 'max']);

export default {
  name: 'SettingParamItem',
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const isSpinner = computed(() => props.param.ctrlType === 'spinner');

    function onFieldChange(field, rawValue) {
      const value = numericFields.has(field) ? Number(rawValue) : rawValue;
      emit('update', field, value);
    }

    return { dataTypeOptions, ctrlTypeOptions, isSpinner, onFieldChange };
  }
}
</script>

<style scoped>
.param-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 4px;
  border: var(--base-outline-border);
  overflow-y: auto;
}

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

.detail-input-num {
  text-align: right;
}

.detail-input:disabled,
.detail-select:disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: default;
}
</style>
