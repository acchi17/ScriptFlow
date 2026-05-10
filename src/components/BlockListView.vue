<template>
  <div class="block-list-view" @click="clearState">
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
import { useSystemState } from '../composables/useSystemState';

export default {
  name: 'BlockListView',

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

    const { clearState } = useSystemState();

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
      onDragEndBlock,
      clearState
    };
  }
}
</script>

<style scoped>
.block-list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
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
