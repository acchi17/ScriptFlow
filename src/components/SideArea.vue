<template>
  <div class="side-area" :class="{ 'executing': isExecuting }">
    <div class="top-item">
      <BlockListView />
    </div>
    <div class="bottom-item">
      <EntryView />
    </div>
  </div>
</template>

<script>
import BlockListView from './BlockListView.vue';
import EntryView from './EntryView.vue';
import { useSystemState } from '../composables/useSystemState';

export default {
  name: 'SideArea',
  components: {
    BlockListView,
    EntryView
  },
  setup() {
    const { isExecuting } = useSystemState()
    return { isExecuting }
  }
}
</script>

<style scoped>
.side-area {
  height: 100vh;
  width: var(--left-side-width);
  display: flex;
  flex-direction: column;
  background-color: var(--left-side-bg-color);
}

.side-area.executing {
  pointer-events: none;
  opacity: 0.5;
}

.top-item {
  flex: 6;
  display: flex;
  overflow-y: auto;
}

.bottom-item {
  flex: 4;
  display: flex;
  overflow-y: auto;
}
</style>
