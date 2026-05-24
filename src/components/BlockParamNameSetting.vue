<template>
  <div class="block-param-name-setting">
    <SettingListItem :style="{ flex: 1 }"
      :title="`Input Parameters — ${blockName}`"
      :items="inputParamNames"
      :selected-item="selectedInputName"
      @update:selected-item="$emit('update:selectedInputName', $event)"
      @move-up="$emit('move-up', 'input', $event)"
      @move-down="$emit('move-down', 'input', $event)"
      @add="$emit('add', 'input', $event)"
      @rename="(old, nw) => $emit('rename', 'input', old, nw)"
      @delete="$emit('delete', 'input', $event)"
    />
    <SettingListItem :style="{ flex: 1 }"
      :title="`Output Parameters — ${blockName}`"
      :items="outputParamNames"
      :selected-item="selectedOutputName"
      @update:selected-item="$emit('update:selectedOutputName', $event)"
      @move-up="$emit('move-up', 'output', $event)"
      @move-down="$emit('move-down', 'output', $event)"
      @add="$emit('add', 'output', $event)"
      @rename="(old, nw) => $emit('rename', 'output', old, nw)"
      @delete="$emit('delete', 'output', $event)"
    />
  </div>
</template>

<script>
import SettingListItem from './SettingListItem.vue';

export default {
  name: 'BlockParamNameSetting',
  components: { SettingListItem },
  props: {
    blockName:          { type: String, required: true },
    inputParamNames:    { type: Array,  required: true },
    outputParamNames:   { type: Array,  required: true },
    selectedInputName:  { type: String, default: null },
    selectedOutputName: { type: String, default: null },
  },
  emits: [
    'update:selectedInputName',
    'update:selectedOutputName',
    'move-up', 'move-down', 'add', 'rename', 'delete',
  ],
}
</script>

<style scoped>
.block-param-name-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
