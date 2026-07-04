<template>
  <div class="param-detail">
    <div class="panel-header">{{ title }}</div>
    <div class="detail-body">
      <LabeledComboBox
        label="Data Type"
        :items="dataTypeOptions"
        :value="param.dataType"
        @update:value="onUpdate('dataType', $event)" />
      <template v-if="!outputMode">
        <SettingParamNumeric
          v-if="param.dataType === 'integer' || param.dataType === 'real'"
          :param="param"
          @update="onUpdate" />
        <SettingParamBoolean
          v-else-if="param.dataType === 'boolean'"
          :param="param"
          @update="onUpdate" />
        <SettingParamText
          v-else-if="param.dataType === 'string'"
          :param="param"
          @update="onUpdate" />
      </template>
      <LabeledTextBox
        labelText="Comment"
        dataType="string"
        :value="param.comment"
        @update:value="onUpdate('comment', $event)" />
    </div>
  </div>
</template>

<script>
import SettingParamNumeric from './SettingParamNumeric.vue';
import SettingParamBoolean from './SettingParamBoolean.vue';
import SettingParamText    from './SettingParamText.vue';
import LabeledComboBox     from './LabeledComboBox.vue';
import LabeledTextBox      from './LabeledTextBox.vue';

const dataTypeOptions = {
  Integer: 'integer',
  Real:    'real',
  Boolean: 'boolean',
  String:  'string',
};

export default {
  name: 'SettingParamItem',
  components: { SettingParamNumeric, SettingParamBoolean, SettingParamText, LabeledComboBox, LabeledTextBox },
  props: {
    title:      { type: String,  required: true },
    param:      { type: Object,  required: true },
    outputMode: { type: Boolean, default: false },
  },
  emits: ['update'],
  setup(_, { emit }) {
    function onUpdate(field, value) {
      emit('update', field, value);
    }

    return { dataTypeOptions, onUpdate };
  }
}
</script>

<style scoped>
.param-detail {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  border: var(--base-outline-border);
  font-size: 12px;
  overflow: hidden;
}

.panel-header {
  padding: 4px 12px;
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
</style>
