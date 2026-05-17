<template>
  <div class="block-setting-view">
    <div class="header">
      <span class="title">Block Setting</span>
      <button class="close-btn" @click="$emit('close')"></button>
    </div>
    <div class="body">
      <div class="two-panel">
        <SettingListItem
          title="CATEGORY"
          :items="categoryNames"
          :selected-item="activeCategory"
          @update:selected-item="onCategorySelected"
          @move-up="onMoveUpCategory"
          @move-down="onMoveDownCategory"
          @add="onAddCategory"
          @rename="onRenameCategory"
          @delete="onDeleteCategory"
        />
        <SettingListItem
          :title="`BLOCK — ${activeCategory}`"
          :items="activeBlockList"
          :selected-item="selectedBlock"
          @update:selected-item="selectedBlock = $event"
          @move-up="onMoveUpBlock"
          @move-down="onMoveDownBlock"
          @add="onAddBlock"
          @rename="onRenameBlock"
          @delete="onDeleteBlock"
        />
      </div>
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
import SettingListItem from './SettingListItem.vue';
import BlockSettingBlockParams from './BlockSettingBlockParams.vue';

export default {
  name: 'BlockSettingView',
  components: { SettingListItem, BlockSettingBlockParams },
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

    const categoryNames = computed(() => {
      refreshTrigger.value;
      return categories.value.map(c => c.name);
    });

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

    function onMoveUpCategory() {
      entryDefinitionService.moveCategoryUp(activeCategory.value);
      bumpRefresh();
      persist();
    }

    function onMoveDownCategory() {
      entryDefinitionService.moveCategoryDown(activeCategory.value);
      bumpRefresh();
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

    function onRenameCategory(oldName, newName) {
      if (entryDefinitionService.renameCategory(oldName, newName)) {
        bumpRefresh();
        activeCategory.value = newName.trim();
        persist();
      }
    }

    function onDeleteCategory() {
      entryDefinitionService.removeCategory(activeCategory.value);
      bumpRefresh();
      activeCategory.value = entryDefinitionService.blockCategories[0]?.name ?? '';
      selectedBlock.value = null;
      persist();
    }

    function onMoveUpBlock(blockName) {
      entryDefinitionService.moveBlockUp(blockName);
      bumpRefresh();
      persist();
    }

    function onMoveDownBlock(blockName) {
      entryDefinitionService.moveBlockDown(blockName);
      bumpRefresh();
      persist();
    }

    function onAddBlock(insertIndex) {
      console.log('Adding block at index', insertIndex, 'in category', activeCategory.value);
      const newName = entryDefinitionService.addBlock(activeCategory.value, null, insertIndex);
      if (newName) {
        bumpRefresh();
        selectedBlock.value = newName;
        persist();
      }
    }
    
    function onRenameBlock(oldName, newName) {
      if (entryDefinitionService.renameBlock(oldName, newName)) {
        bumpRefresh();
        selectedBlock.value = newName.trim();
        persist();
      }
    }

    function onDeleteBlock(blockName) {
      entryDefinitionService.removeBlock(blockName);
      bumpRefresh();
      selectedBlock.value = null;
      persist();
    }

    return {
      categories,
      categoryNames,
      activeCategory,
      activeBlockList,
      selectedBlock,
      inputParams,
      outputParams,
      onCategorySelected,
      onMoveUpCategory,
      onMoveDownCategory,
      onDeleteCategory,
      onAddCategory,
      onMoveUpBlock,
      onMoveDownBlock,
      onAddBlock,
      onDeleteBlock,
      onRenameCategory,
      onRenameBlock,
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

.two-panel {
  display: flex;
  gap: 8px;
  padding: 8px;
}
</style>
