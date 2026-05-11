<template>
  <div class="block-setting-view">
    <div class="header">
      <span class="title">Block Setting</span>
      <button class="close-btn" @click="$emit('close')"></button>
    </div>
    <div class="tabs">
      <button
        v-for="cat in categories"
        :key="cat.name"
        class="tab"
        :class="{ active: activeCategory === cat.name }"
        @click="selectCategory(cat.name)"
      >{{ cat.name }}</button>
    </div>
    <div class="body">
      <div class="block-list">
        <div
          v-for="blockName in activeBlockList"
          :key="blockName"
          class="block-row"
          :class="{ selected: selectedBlock === blockName }"
          @click.stop="selectedBlock = blockName"
        >
          <span class="block-name">{{ blockName }}</span>
          <div v-if="selectedBlock === blockName" class="action-buttons">
            <button
              class="action-btn up-btn"
              :class="{ disabled: isFirst(blockName) }"
              @click.stop="onMoveUp(blockName)"
            ></button>
            <button
              class="action-btn down-btn"
              :class="{ disabled: isLast(blockName) }"
              @click.stop="onMoveDown(blockName)"
            ></button>
            <button class="action-btn setting-btn" @click.stop="$emit('edit-block', blockName)"></button>
            <button class="action-btn delete-btn" @click.stop="onDelete(blockName)"></button>
          </div>
        </div>
        <div class="add-row" @click.stop>
          <span>+</span>
        </div>
      </div>

      <template v-if="selectedBlock">
        <div class="param-section">
          <div class="param-section-header">Input</div>
          <table class="param-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Data type</th>
                <th>UI type</th>
                <th>Initial value</th>
                <th>Step</th>
                <th>Min</th>
                <th>Max</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="param in inputParams" :key="param.name">
                <td>{{ param.name }}</td>
                <td>{{ formatDataType(param.dataType) }}</td>
                <td>{{ formatCtrlType(param.ctrlType) }}</td>
                <td>{{ param.default ?? '' }}</td>
                <td>{{ param.step ?? '' }}</td>
                <td>{{ param.min ?? '' }}</td>
                <td>{{ param.max ?? '' }}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="add-row" @click.stop><span>+</span></div>
        </div>

        <div class="param-section">
          <div class="param-section-header">Output</div>
          <table class="param-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Data type</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="param in outputParams" :key="param.name">
                <td>{{ param.name }}</td>
                <td>{{ formatDataType(param.dataType) }}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="add-row" @click.stop><span>+</span></div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { inject, ref, computed } from 'vue';

export default {
  name: 'BlockSettingView',
  emits: ['close', 'edit-block'],

  setup() {
    const entryDefinitionService = inject('entryDefinitionService');

    const categories = computed(() => entryDefinitionService.blockCategories);
    const activeCategory = ref(
      entryDefinitionService.blockCategories[0]?.name ?? ''
    );
    const selectedBlock = ref(null);

    const activeBlockList = computed(() => {
      const cat = entryDefinitionService.blockCategories.find(
        c => c.name === activeCategory.value
      );
      return cat ? [...cat.blocks] : [];
    });

    const selectedBlockDef = computed(() =>
      selectedBlock.value ? entryDefinitionService.blockDefinitions[selectedBlock.value] ?? null : null
    );
    const inputParams = computed(() => selectedBlockDef.value?.parameters?.input ?? []);
    const outputParams = computed(() => selectedBlockDef.value?.parameters?.output ?? []);

    function formatDataType(dt) {
      return dt ? dt.charAt(0).toUpperCase() + dt.slice(1) : '';
    }

    function formatCtrlType(ct) {
      const map = {
        'integer_spinner': 'Spin',
        'real_spinner': 'Spin',
        'check_box': 'Check',
        'combo_box': 'Combo',
        'text_box': 'Text',
      };
      return map[ct] ?? (ct || '');
    }

    function selectCategory(name) {
      activeCategory.value = name;
      selectedBlock.value = null;
    }

    function isFirst(blockName) {
      return activeBlockList.value[0] === blockName;
    }

    function isLast(blockName) {
      const list = activeBlockList.value;
      return list[list.length - 1] === blockName;
    }

    async function persist() {
      try {
        await entryDefinitionService.saveBlockDefinitions();
      } catch (e) {
        console.warn('[BlockSettingView] saveBlockDefinitions skipped:', e.message);
      }
    }

    function onMoveUp(blockName) {
      entryDefinitionService.moveBlockUp(blockName);
      persist();
    }

    function onMoveDown(blockName) {
      entryDefinitionService.moveBlockDown(blockName);
      persist();
    }

    function onDelete(blockName) {
      entryDefinitionService.removeBlock(blockName);
      selectedBlock.value = null;
      persist();
    }

    return {
      categories,
      activeCategory,
      activeBlockList,
      selectedBlock,
      inputParams,
      outputParams,
      formatDataType,
      formatCtrlType,
      selectCategory,
      isFirst,
      isLast,
      onMoveUp,
      onMoveDown,
      onDelete,
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
  border-bottom: var(--base-outline-border, 1px solid #ccc);
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

.body {
  flex: 1;
  overflow-y: auto;
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

.param-section {
  border-top: var(--base-outline-border, 1px solid #ccc);
  padding: 8px 0;
}

.param-section-header {
  padding: 4px 12px 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.param-table th,
.param-table td {
  padding: 4px 8px;
  border: var(--base-outline-border, 1px solid #ccc);
  color: #333;
  white-space: nowrap;
}

.param-table th {
  background-color: rgba(0, 0, 0, 0.04);
  font-weight: 600;
  text-align: left;
}

.param-table td {
  background-color: #fff;
}
</style>
