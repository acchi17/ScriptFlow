<template>
  <div class="two-panel">
    <SettingListItem
      title="CATEGORY"
      :items="categoryNames"
      :selected-item="activeCategory"
      @update:selected-item="$emit('category-selected', $event)"
      @move-up="$emit('category-move-up', activeCategory)"
      @move-down="$emit('category-move-down', activeCategory)"
      @add="$emit('category-add', $event)"
      @delete="$emit('category-delete', activeCategory)"
    />
    <SettingListItem
      :title="`BLOCK — ${activeCategory}`"
      :items="activeBlockList"
      :selected-item="selectedBlock"
      @update:selected-item="$emit('update:selected-block', $event)"
      @move-up="$emit('move-up', selectedBlock)"
      @move-down="$emit('move-down', selectedBlock)"
      @add="$emit('add', $event)"
      @delete="$emit('delete', selectedBlock)"
    />
  </div>
</template>

<script>
import { computed } from 'vue';
import SettingListItem from './SettingListItem.vue';

export default {
  name: 'BlockSettingBlockList',
  components: { SettingListItem },
  props: {
    categories: { type: Array, required: true },
    activeCategory: { type: String, required: true },
    activeBlockList: { type: Array, required: true },
    selectedBlock: { type: String, default: null },
  },
  emits: [
    'category-selected', 'category-move-up', 'category-move-down', 'category-add', 'category-delete',
    'update:selected-block', 'move-up', 'move-down', 'delete', 'add',
  ],
  setup(props) {
    const categoryNames = computed(() => props.categories.map(c => c.name));
    return { categoryNames };
  }
}
</script>

<style scoped>
.two-panel {
  display: flex;
  gap: 8px;
  padding: 8px;
}
</style>
