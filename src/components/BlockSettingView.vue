<template>
  <div class="block-setting-view">
    <div class="header">
      <span class="title">Block Setting</span>
      <button class="close-btn" @click="$emit('close')"></button>
    </div>
    <div class="body">
      <BlockNameSetting :style="{ flex: '0 0 30%' }"
        @update:selected-block="selectedBlock = $event"
        @change="onNamesChange"
      />
      <BlockParamSetting :style="{ flex: 1 }"
        v-if="selectedBlock"
        :block-name="selectedBlock"
        @change="onParamsChange"
      />
    </div>
  </div>
</template>

<script>
import { inject, ref } from 'vue';
import BlockNameSetting from './BlockNameSetting.vue';
import BlockParamSetting from './BlockParamSetting.vue';

export default {
  name: 'BlockSettingView',
  components: { BlockNameSetting, BlockParamSetting },
  emits: ['close'],

  setup() {
    const entryDefinitionService = inject('entryDefinitionService');

    const selectedBlock = ref(
      entryDefinitionService.blockCategories[0]?.blocks[0] ?? null
    );

    async function persist() {
      try {
        await entryDefinitionService.saveBlockDefinitions();
      } catch (e) {
        console.warn('[BlockSettingView] saveBlockDefinitions skipped:', e.message);
      }
    }

    function onNamesChange() {
      persist();
    }

    function onParamsChange() {
      persist();
    }

    return {
      selectedBlock,
      onNamesChange,
      onParamsChange,
    };
  }
}
</script>

<style scoped>
.block-setting-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--left-side-bg-color, #fff);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
}

.title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 20px;
  height: 20px;
  background: var(--close-icon-image) center / contain no-repeat;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
}

.close-btn:hover {
  opacity: 1;
}

.body {
  flex: 1;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}
</style>
