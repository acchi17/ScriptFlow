<template>
  <div class="param-detail">
    <div class="panel-header">{{ title }}</div>
    <div class="detail-body">
      <div class="detail-row">
        <span class="detail-label">Data Type</span>
        <select class="detail-select" :value="param.dataType" @change="onFieldChange('dataType', $event.target.value)">
          <option v-for="dt in dataTypeOptions" :key="dt.value" :value="dt.value">{{ dt.label }}</option>
        </select>
      </div>
      <div v-if="!outputMode" class="detail-row">
        <span class="detail-label">UI Type</span>
        <select class="detail-select" :value="param.ctrlType" @change="onFieldChange('ctrlType', $event.target.value)">
          <option v-for="ct in availableCtrlTypes" :key="ct.value" :value="ct.value">{{ ct.label }}</option>
        </select>
      </div>
      <div v-if="!outputMode" class="detail-row">
        <span class="detail-label">Initial Value</span>
        <input class="detail-input detail-input-num" type="number"
          :value="param.default"
          @change="onFieldChange('default', $event.target.value)" />
      </div>
      <div v-if="!outputMode" class="detail-row">
        <span class="detail-label">Step Value</span>
        <input class="detail-input detail-input-num" type="number"
          :value="param.step"
          :disabled="!isSpinner"
          @change="onFieldChange('step', $event.target.value)" />
      </div>
      <div v-if="!outputMode" class="detail-row">
        <span class="detail-label">Min value</span>
        <input class="detail-input detail-input-num" type="number"
          :value="param.min"
          :disabled="!isSpinner"
          @change="onFieldChange('min', $event.target.value)" />
      </div>
      <div v-if="!outputMode" class="detail-row">
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
  { value: 'spinner',   label: 'Spinner' },
  { value: 'check_box', label: 'Check Box' },
  { value: 'text_box',  label: 'Text Box' },
  { value: 'combo_box', label: 'Combo Box' },
];

const ctrlTypeMap = {
  integer: ['spinner', 'combo_box'],
  real:    ['spinner', 'combo_box'],
  boolean: ['check_box'],
  string:  ['text_box', 'combo_box'],
};

const numericFields = new Set(['default', 'step', 'min', 'max']);

export default {
  name: 'SettingParamItem',
  props: {
    title:      { type: String,  required: true },
    param:      { type: Object,  required: true },
    outputMode: { type: Boolean, default: false },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const isSpinner = computed(() => props.param.ctrlType === 'spinner');
    const availableCtrlTypes = computed(() =>
      ctrlTypeOptions.filter(o => ctrlTypeMap[props.param.dataType]?.includes(o.value))
    );

    function onFieldChange(field, rawValue) {
      const value = numericFields.has(field) ? Number(rawValue) : rawValue;
      emit('update', field, value);

      if (field === 'dataType') {
        const allowed = ctrlTypeMap[value] ?? [];
        if (!allowed.includes(props.param.ctrlType)) {
          emit('update', 'ctrlType', allowed[0]);
        }
      }
    }

    return { dataTypeOptions, availableCtrlTypes, isSpinner, onFieldChange };
  }
}
</script>

<style scoped>
.param-detail {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  border: var(--base-outline-border);
  overflow: hidden;
}

.panel-header {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #777;
  border-bottom: var(--base-outline-border);
  user-select: none;
  white-space: nowrap;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
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
