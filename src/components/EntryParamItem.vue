<template>
  <div
    class="param-badge"
    :class="paramTypeClass"
    @click.stop="isParamLinkVisible && onConnect()"
  >
    <template v-if="isParamTypeVisible">
      <span class="param-type">123</span>
      <span class="element-partition"/>
    </template>
    <template v-if="isParamLinkVisible">
      <span
        class="link-wrapper"
        @mouseenter="isListVisible = true"
        @mouseleave="isListVisible = false"
      >
        <span class="link-button"
              :class="{ 'connected': isConnected,
                        'connecting-src': isConnectingSrc,
                        'connecting-tgt': isConnectingTgt }"
        />
        <ConnectionListView
          v-if="isListVisible && isConnected && !isConnecting"
          :entry-id="entryId"
          :param-name="paramName"
          :param-category="paramCategory"
        />
      </span>
      <span class="element-partition"/>
    </template>
    <span
      class="param-name"
      :class="{
        'restricted': !isParamTypeVisible && isParamLinkVisible,
        'fixed': !isParamTypeVisible && !isParamLinkVisible
      }"
    >{{ paramName }}</span>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useSystemState } from '../composables/useSystemState'
import ConnectionListView from './ConnectionListView.vue'

export default {
  name: 'EntryParamItem',
  components: { ConnectionListView },

  props: {
    entryId: {
      type: String,
      required: true
    },
    paramName: {
      type: String,
      required: true
    },
    paramCategory: {
      type: String,
      required: true
    },
    paramType: {
      type: String,
      default: null
    },
    isParamTypeVisible: {
      type: Boolean,
      default: true
    },
    isParamLinkVisible: {
      type: Boolean,
      default: true
    }
  },

  setup(props) {
    const {
      isConnecting,
      isConnectingSource,
      isConnectingTarget,
      isConnectedEndPoint,
      startConnection,
      cancelConnection,
      endConnection,
    } = useSystemState()

    const isConnectingSrc = computed(
      () => isConnectingSource(props.entryId, props.paramName, props.paramCategory).value
    )
    const isConnectingTgt = computed(
      () => isConnectingTarget(props.entryId).value
    )
    const isConnected = computed(
      () => isConnectedEndPoint(props.entryId, props.paramName, props.paramCategory).value
    )

    const onConnect = () => {
      if (isConnectingSrc.value) {
        cancelConnection()
      } else if (isConnecting.value && isConnectingTgt.value) {
        endConnection(props.entryId, props.paramName, props.paramCategory, props.paramType)
      } else {
        startConnection(props.entryId, props.paramName, props.paramCategory, props.paramType)
      }
    }

    const isListVisible = ref(false)

    const paramTypeClass = computed(() => {
      if (!props.paramType) return null
      return `type-${props.paramType}`
    })

    return { isConnecting, isConnectingSrc, isConnectingTgt, isConnected, onConnect, isListVisible, paramTypeClass }
  }
}
</script>

<style scoped>
.param-badge {
  height: var(--param-badge-height);
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  font-size: var(--param-badge-normal-font-size);
  font-weight: 500;
  color: var(--param-badge-font-color);
  border: var(--param-badge-border);
  border-radius: var(--param-badge-border-radius);
}

.param-badge.type-integer {
  background-color: var(--param-badge-bg-color-integer);
}

.param-badge.type-real {
  background-color: var(--param-badge-bg-color-real);
}

.param-badge.type-boolean {
  background-color: var(--param-badge-bg-color-boolean);
}

.param-badge.type-string {
  background-color: var(--param-badge-bg-color-string);
}

.param-badge.type-image {
  background-color: var(--param-badge-bg-color-image);
}

.element-partition {
  height: 80%;
  width: 1px;
  background-color: #666;
}

.param-name {
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}

.param-name.restricted {
  max-width: 160px;
  font-size: var(--param-badge-compact-font-size);
  overflow: hidden;
  text-overflow: ellipsis;
}

.param-name.fixed {
  width: calc(var(--connection-lane-width) - 44px);
  font-size: var(--param-badge-compact-font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.link-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.link-button {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-image: var(--unlink-icon-image);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
}

.link-button.connected {
  background-image: var(--linked-icon-image);
  background-color: var(--param-badge-linked-color);
}

.link-button.connecting-src {
  background-image: none;
  background-color: var(--param-badge-linked-color);
}

.link-button.connecting-tgt {
  background-image: none;
  animation: link-button-blink 1.0s ease-in-out infinite;
}

@keyframes link-button-blink {
  0%, 100% { background-color: var(--param-badge-linked-color); }
  50% { background-color: transparent; }
}
</style>
