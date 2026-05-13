<template>
  <div class="tabs">
    <button
      v-for="cat in categories"
      :key="cat.name"
      class="tab"
      :class="{ active: activeCategory === cat.name }"
      @click="$emit('category-selected', cat.name)"
    >{{ cat.name }}</button>
  </div>
  <div class="block-list">
    <div
      v-for="blockName in activeBlockList"
      :key="blockName"
      class="block-row"
      :class="{ selected: selectedBlock === blockName }"
      @click.stop="$emit('update:selected-block', blockName)"
    >
      <span class="block-name">{{ blockName }}</span>
      <div v-if="selectedBlock === blockName" class="action-buttons">
        <button
          class="action-btn up-btn"
          :class="{ disabled: isFirst(blockName) }"
          @click.stop="$emit('move-up', blockName)"
        ></button>
        <button
          class="action-btn down-btn"
          :class="{ disabled: isLast(blockName) }"
          @click.stop="$emit('move-down', blockName)"
        ></button>
        <button class="action-btn setting-btn" @click.stop="$emit('edit-block', blockName)"></button>
        <button class="action-btn delete-btn" @click.stop="$emit('delete', blockName)"></button>
      </div>
    </div>
    <div class="add-row" @click.stop="$emit('add')">
      <span>+</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BlockSettingBlockList',
  props: {
    categories: { type: Array, required: true },
    activeCategory: { type: String, required: true },
    activeBlockList: { type: Array, required: true },
    selectedBlock: { type: String, default: null },
  },
  emits: ['category-selected', 'update:selected-block', 'move-up', 'move-down', 'delete', 'add', 'edit-block'],
  setup(props) {
    function isFirst(blockName) {
      return props.activeBlockList[0] === blockName;
    }
    function isLast(blockName) {
      const list = props.activeBlockList;
      return list[list.length - 1] === blockName;
    }
    return { isFirst, isLast };
  }
}
</script>

<style scoped>
.tabs {
  display: flex;
  border-bottom: var(--base-outline-border, 1px solid #ccc);
  padding: 0 8px;
}

.tab {
  padding: 6px 10px;
  font-size: 13px;
  color: #555;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tab.active {
  color: #333;
  font-weight: 600;
  border-bottom-color: #555;
}

.tab:hover:not(.active) {
  color: #333;
}

.block-list {
  padding-bottom: 4px;
}

.block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.block-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.block-row.selected {
  background-color: rgba(0, 0, 0, 0.08);
}

.block-name {
  flex: 1;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
  background-color: transparent;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.action-btn:hover:not(.disabled) {
  opacity: 1;
}

.action-btn.disabled {
  opacity: 0.25;
  cursor: default;
  pointer-events: none;
}

.up-btn {
  background-image: var(--left-2-arrow-icon-image);
  transform: rotate(-90deg);
}

.down-btn {
  background-image: var(--right-2-arrow-icon-image);
  transform: rotate(90deg);
}

.setting-btn {
  background-image: var(--setting-icon-image);
}

.delete-btn {
  background-image: var(--trash-icon-image);
}

.add-row {
  padding: 6px 12px;
  font-size: 18px;
  color: #888;
  cursor: pointer;
  user-select: none;
}

.add-row:hover {
  color: #333;
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
