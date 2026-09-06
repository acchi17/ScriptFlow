<template>
  <div id="app">
    <MenuArea />
    <div class="row-content">
      <div class="left">
        <SideArea :refresh-key="blockListRefreshKey" @open-setting="showBlockSetting = true" />
      </div>
      <div class="center">
        <MainArea />
      </div>
    </div>
    <BlockSettingView
      v-if="showBlockSetting"
      class="block-setting-overlay"
      @close="showBlockSetting = false; blockListRefreshKey++"
    />
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, inject, ref } from 'vue'
import { useSystemState } from './composables/useSystemState'
import MenuArea from './components/MenuArea.vue'
import MainArea from './components/MainArea.vue'
import SideArea from './components/SideArea.vue'
import BlockSettingView from './components/BlockSettingView.vue'

export default {
  name: 'App',
  components: {
    MenuArea,
    MainArea,
    SideArea,
    BlockSettingView,
  },
  setup() {
    const entryExecutionService = inject('entryExecutionService')
    const showBlockSetting = ref(false)
    const blockListRefreshKey = ref(0)
    const { resetState } = useSystemState()

    function handleBeforeUnload() {
      console.log('Application unloading, performing cleanup...')
      if (entryExecutionService) {
        entryExecutionService.terminate()
      }
    }

    onMounted(() => {
      window.addEventListener('beforeunload', handleBeforeUnload)
      document.addEventListener('click', resetState)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', resetState)
      if (entryExecutionService) {
        entryExecutionService.terminate()
      }
    })

    return { showBlockSetting, blockListRefreshKey }
  }
}
</script>

<style>
/* Reset default browser styles and
   normalize box-sizing for consistent layout across all elements */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Root application container */
#app {
  font-family: var(--app-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Row below the menu bar */
.row-content {
  display: flex;
  flex: 1;
  position: relative;
}

.block-setting-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
}

/* Left sidebar - contains drag-drop items */
.left {
  flex: 0 0 auto;
  border-right: var(--base-outline-border);
}

/* Center content area - main workspace */
.center {
  flex: 1 0 auto;
}

</style>
