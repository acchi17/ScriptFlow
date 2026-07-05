<template>
  <div class="block-param-detail-setting">
    <div class="detail-item">
      <SettingInputParam :style="{ flex: 1 }"
        v-if="selectedInputParamDef"
        :title="`Input Parameter Setting - ${selectedInputParamDef.name}`"
        :param="selectedInputParamDef"
        :dataTypeOptions="dataTypeOptions"
        @update="(field, value) => $emit('update-input', field, value)"
      />
    </div>
    <div class="detail-item">
      <SettingOutputParam :style="{ flex: 1 }"
        v-if="selectedOutputParamDef"
        :title="`Output Parameter Setting - ${selectedOutputParamDef.name}`"
        :param="selectedOutputParamDef"
        :dataTypeOptions="dataTypeOptions"
        @update="(field, value) => $emit('update-output', field, value)"
      />
    </div>
  </div>
</template>

<script>
import SettingInputParam  from './SettingInputParam.vue';
import SettingOutputParam from './SettingOutputParam.vue';

const dataTypeOptions = new Map([
  ['Integer', 'integer'],
  ['Real',    'real'],
  ['Boolean', 'boolean'],
  ['String',  'string'],
]);

export default {
  name: 'BlockParamDetailSetting',
  components: { SettingInputParam, SettingOutputParam },
  props: {
    selectedInputParamDef:  { type: Object, default: null },
    selectedOutputParamDef: { type: Object, default: null },
  },
  emits: ['update-input', 'update-output'],
  setup() {
    return { dataTypeOptions };
  },
}
</script>

<style scoped>
.block-param-detail-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  min-height: 0;
  flex: 1;
  display: flex;
}
</style>
