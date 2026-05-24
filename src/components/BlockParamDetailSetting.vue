<template>
  <div class="block-param-detail-setting">
    <div class="detail-item">
      <SettingParamItem :style="{ flex: 1 }"
        v-if="selectedInputParamDef"
        :param="selectedInputParamDef"
        @update="(field, value) => $emit('update-input', field, value)"
      />
    </div>
    <div class="detail-item">
      <SettingParamItem :style="{ flex: 1 }"
        v-if="selectedOutputParamDef"
        :param="selectedOutputParamDef"
        @update="(field, value) => $emit('update-output', field, value)"
      />
    </div>
  </div>
</template>

<script>
import SettingParamItem from './SettingParamItem.vue';

export default {
  name: 'BlockParamDetailSetting',
  components: { SettingParamItem },
  props: {
    selectedInputParamDef:  { type: Object, default: null },
    selectedOutputParamDef: { type: Object, default: null },
  },
  emits: ['update-input', 'update-output'],
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
