<template>
  <div class="block-list-view">
    <div class="block-list-header">
      <button class="setting-icon" @click.stop="$emit('open-setting')"></button>
    </div>
    <div v-for="cat in categories" :key="cat.name" class="block-category">
      <div class="category-header" @click="toggleCategory(cat.name)">
        <span class="category-arrow" :class="{ collapsed: !expanded[cat.name] }"></span>
        <span class="category-name">{{ cat.name }}</span>
      </div>
      <div v-show="expanded[cat.name]">
        <div
          v-for="blockName in cat.blocks"
          :key="blockName"
          class="block-name-item"
          draggable="true"
          @dragstart="onDragStartBlock"
          @dragend="onDragEndBlock"
        >{{ blockName }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, ref, reactive, watch, onMounted } from 'vue';
import { useDraggable } from '../composables/useDraggable';

export default {
  name: 'BlockListView',
  emits: ['open-setting'],
  props: {
    refreshKey: { type: Number, default: 0 }
  },

  setup(props) {
    const entryDefinitionService = inject('entryDefinitionService');
    const categories = ref([]);
    const expanded = reactive({});

    const {
      onDragStart: onDragStartBlock,
      onDragEnd: onDragEndBlock,
      setOnDragStartCallback: setBlockDragStartCallback
    } = useDraggable();

    setBlockDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'block');
      event.dataTransfer.setData('entryName', event.target.textContent);
      event.dataTransfer.setData('sourceId', undefined);
    });

    function refreshCategories() {
      categories.value = entryDefinitionService.blockDefinitions.map(c => ({
        name: c.name,
        blocks: c.blocks.map(b => b.name)
      }));
      Object.keys(expanded).forEach(k => delete expanded[k]);
      categories.value.forEach(c => { expanded[c.name] = true; });
    }

    function toggleCategory(name) {
      expanded[name] = !expanded[name];
    }

    onMounted(async () => {
      await entryDefinitionService.loadBlockDefinitions();
      refreshCategories();
    });

    watch(() => props.refreshKey, refreshCategories);

    return {
      categories,
      expanded,
      toggleCategory,
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
  justify-content: flex-end;
  padding: 8px 12px;
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

.category-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  background-color: var(--block-bg-color);
  border-bottom: var(--base-outline-border);
  user-select: none;
}

.category-header:hover {
  background-color: var(--block-hover-bg-color);
}

.category-arrow {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #555;
  transition: transform 0.15s;
}

.category-arrow.collapsed {
  transform: rotate(-90deg);
}

.block-name-item {
  padding: 6px 12px 6px 20px;
  font-size: 13px;
  color: #333;
  cursor: grab;
  user-select: none;
}

.block-name-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
