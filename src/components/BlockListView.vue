<template>
  <div class="block-list-view" @click="clearState">
    <div class="rect-item">
      <div
        class="rect-icon lime"
        draggable="true"
        @dragstart="onDragStartContainer"
        @dragend="onDragEndContainer"
      ></div>
    </div>
    <div
      v-for="blockName in blockNames"
      :key="blockName"
      class="rect-item"
    >
      <div
        class="rect-icon whitegray"
        draggable="true"
        @dragstart="onDragStartBlock"
        @dragend="onDragEndBlock"
      >{{ blockName }}</div>
    </div>
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

    const {
      onDragStart: onDragStartContainer,
      onDragEnd: onDragEndContainer,
      setOnDragStartCallBack: setContainerDragStartCallback
    } = useDraggable();

    const { clearState } = useSystemState();

    // Set custom callbacks for drag start events
    setBlockDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'block');
      event.dataTransfer.setData('entryName', event.target.textContent);
      event.dataTransfer.setData('sourceId', undefined);
    });

    setContainerDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'container');
      event.dataTransfer.setData('entryName', 'Container');
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
      onDragStartContainer,
      onDragEndContainer,
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
  align-items: center;
}
.rect-item {
  margin-top: 32px;
  width: 50px;
  height: 50px;
}
.rect-icon {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: grab;
}

.rect-icon.whitegray {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  box-sizing: border-box;
}

.rect-icon.lime {
  background-color: #8eec9a;
  border: 1px solid #7bc97b;
}
</style>
