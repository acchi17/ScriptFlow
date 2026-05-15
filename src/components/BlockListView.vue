<template>
  <div class="block-list-view">
    <div class="block-list-header">
      <!-- <span class="block-list-title">Block List</span> -->
      <button class="setting-icon" @click.stop="$emit('open-setting')"></button>
    </div>
    <div
      v-for="blockName in blockNames"
      :key="blockName"
      class="block-name-item"
      draggable="true"
      @dragstart="onDragStartBlock"
      @dragend="onDragEndBlock"
    >{{ blockName }}</div>
  </div>
</template>

<script>
import { inject, ref, onMounted } from 'vue';
import { useDraggable } from '../composables/useDraggable';

export default {
  name: 'BlockListView',
  emits: ['open-setting'],

  setup() {
    // Inject EntryDefinitionService
    const entryDefinitionService = inject('entryDefinitionService');

    // Reactive state for block names
    const blockNames = ref([]);

    // Get composable
    const {
      onDragStart: onDragStartBlock,
      onDragEnd: onDragEndBlock,
      setOnDragStartCallBack: setBlockDragStartCallback
    } = useDraggable();

    // Set custom callbacks for drag start events
    setBlockDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'block');
      event.dataTransfer.setData('entryName', event.target.textContent);
      event.dataTransfer.setData('sourceId', undefined);
    });

    // Load block definitions on mounted
    onMounted(async () => {
      await entryDefinitionService.loadBlockDefinitions();
      blockNames.value = Object.keys(entryDefinitionService.blockDefinitions);
      console.log('blockNames:', blockNames.value);
    });

    // Return values and methods to use in <template>
    return {
      blockNames,
      onDragStartBlock,
      onDragEndBlock
    };
  }
}
</script>

<style scoped>
.block-list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.block-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}

.block-list-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.setting-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
  opacity: 0.6;
  border: none;
  padding: 0;
  background: var(--setting-icon-image) center / contain no-repeat;
  background-color: transparent;
}

.setting-icon:hover {
  opacity: 1;
}

.block-name-item {
  padding: 6px 12px;
  font-size: 13px;
  color: #333;
  cursor: grab;
  user-select: none;
}

.block-name-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
