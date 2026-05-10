<template>
  <div class="side-area" :class="{ 'executing': isExecuting }">
    <div class="top-item">
      <BlockListView @open-setting="showBlockSetting = true" />
    </div>
    <div class="bottom-item">
      <EntryView />
    </div>
    <BlockSettingView
      v-if="showBlockSetting"
      class="block-setting-overlay"
      @close="showBlockSetting = false"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import BlockListView from './BlockListView.vue';
import EntryView from './EntryView.vue';
import BlockSettingView from './BlockSettingView.vue';
import { useSystemState } from '../composables/useSystemState';

export default {
  name: 'SideArea',
  components: {
    BlockListView,
    EntryView,
    BlockSettingView
  },
  setup() {
    const { isExecuting } = useSystemState()
    const showBlockSetting = ref(false)
    return { isExecuting, showBlockSetting }
  }
}
</script>

<style scoped>
.side-area {
  position: relative;
  height: calc(100vh - var(--menu-bar-height));
  width: var(--left-side-width);
  display: flex;
  flex-direction: column;
  background-color: var(--left-side-bg-color);
}

.side-area.executing {
  pointer-events: none;
  opacity: 0.5;
}

.top-item {
  flex: 6;
  display: flex;
  overflow-y: auto;
}

.bottom-item {
  flex: 4;
  display: flex;
  overflow-y: auto;
}

.block-setting-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
}
</style>
