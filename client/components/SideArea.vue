<template>
  <div class="side-area" :class="{ 'executing': isExecuting }">
    <div class="top-item">
      <BlockListView :refresh-key="refreshKey" @open-setting="$emit('open-setting')" />
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
  emits: ['open-setting'],
  components: {
    BlockListView,
    EntryView,
  },
  props: {
    refreshKey: { type: Number, default: 0 }
  },
  setup() {
    const { isExecuting } = useSystemState()
    return { isExecuting }
  }
}
</script>

<style scoped>
.side-area {
  position: relative;
  height: calc(100vh - var(--menu-bar-height));
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
  flex: 5;
  display: flex;
  overflow-y: auto;
}

.bottom-item {
  flex: 5;
  display: flex;
  overflow-y: auto;
}

</style>
