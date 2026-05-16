<template>
  <div class="block-setting-view">
    <div class="header">
      <span class="title">Block Setting</span>
      <button class="close-btn" @click="$emit('close')"></button>
    </div>
    <div class="body">
      <BlockSettingBlockList
        :categories="categories"
        :active-category="activeCategory"
        :active-block-list="activeBlockList"
        :selected-block="selectedBlock"
        @category-selected="onCategorySelected"
        @category-move-up="onCategoryMoveUp"
        @category-move-down="onCategoryMoveDown"
        @category-add="onAddCategory"
        @category-delete="onDeleteCategory"
        @update:selected-block="selectedBlock = $event"
        @move-up="onMoveUp"
        @move-down="onMoveDown"
        @delete="onDelete"
        @add="onAddBlock"
      />
      <BlockSettingBlockParams
        v-if="selectedBlock"
        :input-params="inputParams"
        :output-params="outputParams"
      />
    </div>
  </div>
</template>

<script>
import { inject, ref, computed } from 'vue';
import BlockSettingBlockList from './BlockSettingBlockList.vue';
import BlockSettingBlockParams from './BlockSettingBlockParams.vue';

export default {
  name: 'BlockSettingView',
  components: { BlockSettingBlockList, BlockSettingBlockParams },
  emits: ['close'],

  setup() {
    const entryDefinitionService = inject('entryDefinitionService');

    // entryDefinitionService is a plain (non-reactive) instance; bump this ref
    // after any structural mutation so dependent computeds re-evaluate.
    const refreshTrigger = ref(0);
    const bumpRefresh = () => { refreshTrigger.value++; };

    const categories = computed(() => {
      refreshTrigger.value;
      return [...entryDefinitionService.blockCategories];
    });
    const activeCategory = ref(
      entryDefinitionService.blockCategories[0]?.name ?? ''
    );
    const selectedBlock = ref(
      entryDefinitionService.blockCategories[0]?.blocks[0] ?? null
    );

    const activeBlockList = computed(() => {
      refreshTrigger.value;
      const cat = entryDefinitionService.blockCategories.find(
        c => c.name === activeCategory.value
      );
      return cat ? [...cat.blocks] : [];
    });

    const selectedBlockDef = computed(() => {
      refreshTrigger.value;
      return selectedBlock.value ? entryDefinitionService.blockDefinitions[selectedBlock.value] ?? null : null;
    });
    const inputParams = computed(() => selectedBlockDef.value?.parameters?.input ?? []);
    const outputParams = computed(() => selectedBlockDef.value?.parameters?.output ?? []);

    async function persist() {
      try {
        await entryDefinitionService.saveBlockDefinitions();
      } catch (e) {
        console.warn('[BlockSettingView] saveBlockDefinitions skipped:', e.message);
      }
    }

    function onCategorySelected(catName) {
      activeCategory.value = catName;
      selectedBlock.value = activeBlockList.value[0] ?? null;
    }

    function onMoveUp(blockName) {
      entryDefinitionService.moveBlockUp(blockName);
      bumpRefresh();
      persist();
    }

    function onMoveDown(blockName) {
      entryDefinitionService.moveBlockDown(blockName);
      bumpRefresh();
      persist();
    }

    function onDelete(blockName) {
      entryDefinitionService.removeBlock(blockName);
      bumpRefresh();
      selectedBlock.value = null;
      persist();
    }

    function onCategoryMoveUp() {
      entryDefinitionService.moveCategoryUp(activeCategory.value);
      bumpRefresh();
      persist();
    }

    function onCategoryMoveDown() {
      entryDefinitionService.moveCategoryDown(activeCategory.value);
      bumpRefresh();
      persist();
    }

    function onDeleteCategory() {
      entryDefinitionService.removeCategory(activeCategory.value);
      bumpRefresh();
      activeCategory.value = entryDefinitionService.blockCategories[0]?.name ?? '';
      selectedBlock.value = null;
      persist();
    }

    function onAddCategory(insertIndex) {
      const newName = entryDefinitionService.addCategory(null, insertIndex);
      if (newName) {
        bumpRefresh();
        activeCategory.value = newName;
        selectedBlock.value = null;
        persist();
      }
    }

    function onAddBlock(insertIndex) {
      const newName = entryDefinitionService.addBlock(activeCategory.value, null, insertIndex);
      if (newName) {
        bumpRefresh();
        selectedBlock.value = newName;
        persist();
      }
    }

    return {
      categories,
      activeCategory,
      activeBlockList,
      selectedBlock,
      inputParams,
      outputParams,
      onCategorySelected,
      onCategoryMoveUp,
      onCategoryMoveDown,
      onDeleteCategory,
      onAddCategory,
      onMoveUp,
      onMoveDown,
      onDelete,
      onAddBlock,
    };
  }
}
</script>

<style scoped>
.block-setting-view {
  display: flex;
  flex-direction: column;
  background-color: var(--left-side-bg-color, #fff);
  height: 100%;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}

.title {
  font-size: 14px;
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
  overflow-y: auto;
}
</style>
