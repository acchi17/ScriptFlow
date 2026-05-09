<template>
  <div id="app">
    <div class="left">
      <SideArea />
    </div>
    <div class="center">
      <MainArea />
    </div>
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, inject } from 'vue'
import MainArea from './components/MainArea.vue'
import SideArea from './components/SideArea.vue'

export default {
  name: 'App',
  components: {
    MainArea,
    SideArea
  },
  setup() {
    // Get injected service instance
    const entryExecutionService = inject('entryExecutionService')

    // Define event handler function
    function handleBeforeUnload() {
      console.log('Application unloading, performing cleanup...')
      if (entryExecutionService) {
        entryExecutionService.terminate()
      }
    }

    // Add event listener when component is mounted
    onMounted(() => {
      window.addEventListener('beforeunload', handleBeforeUnload)
      console.log('Registered beforeunload event handler')
    })

    // Remove event listener and cleanup when component is unmounted
    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      console.log('Removed beforeunload handler and performed cleanup...')
      if (entryExecutionService) {
        entryExecutionService.terminate()
      }
    })
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

/* Root application container with 3-column layout */
#app {
  font-family: var(--app-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  gap: 0;
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
