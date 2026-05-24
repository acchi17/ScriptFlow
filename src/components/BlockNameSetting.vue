<template>
  <div class="block-name-setting">
    <SettingListItem :style="{ flex: 2.5 }"
      title="Categories"
      :items="categoryNames"
      :selected-item="selectedCategoryName"
      @update:selected-item="onCategorySelected"
      @move-up="onMoveUpCategory"
      @move-down="onMoveDownCategory"
      @add="onAddCategory"
      @rename="onRenameCategory"
      @delete="onDeleteCategory"
    />
    <SettingListItem :style="{ flex: 5.5 }"
      :title="`Blocks — ${selectedCategoryName}`"
      :items="activeBlockNames"
      :selected-item="selectedBlockName"
      @update:selected-item="onBlockSelected"
      @move-up="onMoveUpBlock"
      @move-down="onMoveDownBlock"
      @add="onAddBlock"
      @rename="onRenameBlock"
      @delete="onDeleteBlock"
    />
    <BlockScriptSetting :style="{ flex: 2 }" :block-name="selectedBlockName" />
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

    const selectedCategoryName = ref(
      entryDefinitionService.blockCategories[0]?.name ?? ''
    );
    const selectedBlockName = ref(
      entryDefinitionService.blockCategories[0]?.blocks[0] ?? null
    );

    const categoryNames = computed(() => {
      refreshTrigger.value;
      return entryDefinitionService.blockCategories.map(c => c.name);
    });

    const activeBlockNames = computed(() => {
      refreshTrigger.value;
      const cat = entryDefinitionService.blockCategories.find(
        c => c.name === selectedCategoryName.value
      );
      return cat ? [...cat.blocks] : [];
    });

    function emitSelection() {
      emit('update:selected-block', selectedBlockName.value);
    }

    function mutate(fn) {
      fn();
      bumpRefresh();
      emit('change');
    }

    function onCategorySelected(catName) {
      selectedCategoryName.value = catName;
      selectedBlockName.value = activeBlockNames.value[0] ?? null;
      emitSelection();
    }

    function onBlockSelected(blockName) {
      selectedBlockName.value = blockName;
      emitSelection();
    }

    function onMoveUpCategory(catName) {
      mutate(() => entryDefinitionService.moveCategoryUp(catName));
    }

    function onMoveDownCategory(catName) {
      mutate(() => entryDefinitionService.moveCategoryDown(catName));
    }

    function onAddCategory(insertIndex) {
      mutate(() => {
        const newName = entryDefinitionService.addCategory(null, insertIndex);
        if (newName) {
          selectedCategoryName.value = newName;
          selectedBlockName.value = null;
          emitSelection();
        }
      });
    }

    function onRenameCategory(oldName, newName) {
      mutate(() => {
        if (entryDefinitionService.renameCategory(oldName, newName)) {
          selectedCategoryName.value = newName.trim();
        }
      });
    }

    function onDeleteCategory(catName) {
      const idx = categoryNames.value.indexOf(catName);
      mutate(() => entryDefinitionService.removeCategory(catName));
      const newList = categoryNames.value;
      selectedCategoryName.value = newList.length === 0 ? ''
        : idx > 0 ? newList[idx - 1]
        : newList[0];
      selectedBlockName.value = null;
      emitSelection();
    }

    function onMoveUpBlock(blockName) {
      mutate(() => entryDefinitionService.moveBlockUp(blockName));
    }

    function onMoveDownBlock(blockName) {
      mutate(() => entryDefinitionService.moveBlockDown(blockName));
    }

    function onAddBlock(insertIndex) {
      mutate(() => {
        const newName = entryDefinitionService.addBlock(selectedCategoryName.value, null, insertIndex);
        if (newName) {
          selectedBlockName.value = newName;
          emitSelection();
        }
      });
    }

    function onRenameBlock(oldName, newName) {
      mutate(() => {
        if (entryDefinitionService.renameBlock(oldName, newName)) {
          selectedBlockName.value = newName.trim();
          emitSelection();
        }
      });
    }

    function onDeleteBlock(blockName) {
      const idx = activeBlockNames.value.indexOf(blockName);
      mutate(() => entryDefinitionService.removeBlock(blockName));
      const newList = activeBlockNames.value;
      selectedBlockName.value = newList.length === 0 ? null
        : idx > 0 ? newList[idx - 1]
        : newList[0];
      emitSelection();
    }

    return {
      categoryNames,
      selectedCategoryName,
      activeBlockNames,
      selectedBlockName,
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
}
</style>
