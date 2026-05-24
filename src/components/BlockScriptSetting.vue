<template>
  <div class="panel">
    <div class="panel-header">Block Script file</div>
    <div class="panel-body">
      <div v-if="status === 'found'" class="status-found">
        <span class="status-icon">✓</span>
        <span class="status-label">found</span>
      </div>
      <div
        v-else-if="status === 'missing'"
        class="drop-zone"
        :class="{ 'drag-over': isDragOver }"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <span class="drop-icon">⬇</span>
        <span class="drop-label">Drop .mjs here</span>
      </div>
      <div v-else class="status-none">
        <span class="status-icon">—</span>
      </div>
    </div>
  </div>
</template>

<script>
import { inject, ref, computed, onMounted, watch } from 'vue';

export default {
  name: 'BlockScriptSetting',
  props: {
    blockName: { type: String, default: null },
  },

  setup(props) {
    const platformService = inject('platformService');
    const availableScripts = ref([]);
    const isDragOver = ref(false);

    const status = computed(() => {
      if (!platformService.isElectron) return 'unavailable';
      if (!props.blockName) return 'none';
      return availableScripts.value.includes(props.blockName) ? 'found' : 'missing';
    });

    async function loadScripts() {
      availableScripts.value = await platformService.listScripts();
    }

    onMounted(loadScripts);

    watch(() => props.blockName, () => {
      if (status.value === 'missing') isDragOver.value = false;
    });

    function onDragOver() {
      isDragOver.value = true;
    }

    function onDragLeave() {
      isDragOver.value = false;
    }

    async function onDrop(e) {
      isDragOver.value = false;
      const file = e.dataTransfer.files[0];
      if (!file || !props.blockName) return;
      const content = await file.text();
      await platformService.saveScript(props.blockName, content);
      await loadScripts();
    }

    return { status, isDragOver, onDragOver, onDragLeave, onDrop };
  }
}
</script>

<style scoped>
.panel {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: var(--base-outline-border);
  border-radius: 4px;
}

.panel-header {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #777;
  border-bottom: var(--base-outline-border);
  user-select: none;
  white-space: nowrap;
}

.panel-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.status-icon {
  font-size: 20px;
  color: #4caf50;
}

.status-label {
  font-size: 11px;
  color: #4caf50;
}

.status-none .status-icon {
  font-size: 20px;
  color: #bbb;
}

.drop-zone {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 2px dashed #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.drop-zone.drag-over {
  border-color: #1976d2;
  background-color: rgba(25, 118, 210, 0.06);
}

.drop-icon {
  font-size: 16px;
  color: #aaa;
}

.drop-zone.drag-over .drop-icon {
  color: #1976d2;
}

.drop-label {
  font-size: 10px;
  color: #aaa;
  text-align: center;
  line-height: 1.3;
}

.drop-zone.drag-over .drop-label {
  color: #1976d2;
}
</style>
