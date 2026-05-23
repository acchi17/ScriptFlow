<template>
  <div class="block-name-setting">
    <SettingListItem :style="{ flex: 2.5 }"
      title="Category"
      :items="categoryNames"
      :selected-item="activeCategory"
      @update:selected-item="onCategorySelected"
      @move-up="onMoveUpCategory"
      @move-down="onMoveDownCategory"
      @add="onAddCategory"
      @rename="onRenameCategory"
      @delete="onDeleteCategory"
    />
    <SettingListItem :style="{ flex: 5.5 }"
      :title="`Block — ${activeCategory}`"
      :items="activeBlockList"
      :selected-item="selectedBlock"
      @update:selected-item="onBlockSelected"
      @move-up="onMoveUpBlock"
      @move-down="onMoveDownBlock"
      @add="onAddBlock"
      @rename="onRenameBlock"
      @delete="onDeleteBlock"
    />
    <BlockScriptSetting :style="{ flex: 2 }" :block-name="selectedBlock" />
  </div>
</template>

<script>
import { inject, ref, computed } from 'vue';
import SettingListItem from './SettingListItem.vue';
import BlockScriptSetting from './BlockScriptSetting.vue';

export default {
  name: 'BlockNameSetting',
  components: { SettingListItem, BlockScriptSetting },
  emits: ['update:selected-block', 'change'],

  setup(props, { emit }) {
    const entryDefinitionService = inject('entryDefinitionService');

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

    function emitSelection() {
      emit('update:selected-block', selectedBlock.value);
    }

    function mutate(fn) {
      fn();
      bumpRefresh();
      emit('change');
    }

    function onCategorySelected(catName) {
      activeCategory.value = catName;
      selectedBlock.value = activeBlockList.value[0] ?? null;
      emitSelection();
    }

    function onBlockSelected(blockName) {
      selectedBlock.value = blockName;
      emitSelection();
    }

    function onMoveUpCategory() {
      mutate(() => entryDefinitionService.moveCategoryUp(activeCategory.value));
    }

    function onMoveDownCategory() {
      mutate(() => entryDefinitionService.moveCategoryDown(activeCategory.value));
    }

    function onAddCategory(insertIndex) {
      mutate(() => {
        const newName = entryDefinitionService.addCategory(null, insertIndex);
        if (newName) {
          activeCategory.value = newName;
          selectedBlock.value = null;
          emitSelection();
        }
      });
    }

    function onRenameCategory(oldName, newName) {
      mutate(() => {
        if (entryDefinitionService.renameCategory(oldName, newName)) {
          activeCategory.value = newName.trim();
        }
      });
    }

    function onDeleteCategory() {
      mutate(() => {
        entryDefinitionService.removeCategory(activeCategory.value);
        activeCategory.value = entryDefinitionService.blockCategories[0]?.name ?? '';
        selectedBlock.value = null;
        emitSelection();
      });
    }

    function onMoveUpBlock(blockName) {
      mutate(() => entryDefinitionService.moveBlockUp(blockName));
    }

    function onMoveDownBlock(blockName) {
      mutate(() => entryDefinitionService.moveBlockDown(blockName));
    }

    function onAddBlock(insertIndex) {
      mutate(() => {
        const newName = entryDefinitionService.addBlock(activeCategory.value, null, insertIndex);
        if (newName) {
          selectedBlock.value = newName;
          emitSelection();
        }
      });
    }

    function onRenameBlock(oldName, newName) {
      mutate(() => {
        if (entryDefinitionService.renameBlock(oldName, newName)) {
          selectedBlock.value = newName.trim();
          emitSelection();
        }
      });
    }

    function onDeleteBlock(blockName) {
      mutate(() => {
        entryDefinitionService.removeBlock(blockName);
        selectedBlock.value = null;
        emitSelection();
      });
    }

    return {
      categoryNames,
      activeCategory,
      activeBlockList,
      selectedBlock,
      onCategorySelected,
      onBlockSelected,
      onMoveUpCategory,
      onMoveDownCategory,
      onAddCategory,
      onRenameCategory,
      onDeleteCategory,
      onMoveUpBlock,
      onMoveDownBlock,
      onAddBlock,
      onRenameBlock,
      onDeleteBlock,
    };
  }
}
</script>

<style scoped>
.block-name-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}
</style>
