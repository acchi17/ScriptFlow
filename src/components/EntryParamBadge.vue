<template>
  <div
    class="entry-param-badge"
    :class="paramTypeClass"
    @click.stop="isParamLinkVisible && onConnect()"
  >
    <span v-if="isParamTypeVisible" class="param-type">{{ paramTypeLabel }}</span>
    <span
      v-if="isParamLinkVisible"
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
    <span
      v-if="isParamNameVisible"
      class="param-name"
      :class="{
        'restricted': displayMode === 2,
        'fixed': displayMode === 3
      }"
    >{{ paramName }}</span>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useSystemState } from '../composables/useSystemState'
import ConnectionListView from './ConnectionListView.vue'

const PARAM_TYPE_LABELS = {
  integer: '123',
  real: '1.23',
  boolean: 'T/F',
  string: 'Abc',
  image: 'img'
}

export default {
  name: 'EntryParamBadge',
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
    displayMode: {
      type: Number,
      required: true,
      validator: v => [1, 2, 3].includes(v)
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

    const paramTypeLabel = computed(() => PARAM_TYPE_LABELS[props.paramType] ?? '')

    const isParamTypeVisible = computed(() => props.displayMode === 1)
    const isParamLinkVisible = computed(() => props.displayMode === 1 || props.displayMode === 2)
    const isParamNameVisible = computed(() => props.displayMode === 2 || props.displayMode === 3)

    return {
      isConnecting, isConnectingSrc, isConnectingTgt, isConnected, onConnect, isListVisible,
      paramTypeClass, paramTypeLabel, isParamTypeVisible, isParamLinkVisible, isParamNameVisible
    }
  }
}
</script>

<style scoped>
.entry-param-badge {
  height: var(--param-badge-height);
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  font-size: var(--param-badge-normal-font-size);
  font-weight: 500;
  color: var(--param-badge-font-color);
  border: var(--param-badge-border);
  border-radius: var(--param-badge-border-radius);
}

.entry-param-badge.type-integer {
  background-color: var(--param-badge-bg-color-integer);
  border: var(--param-badge-border-integer);
}

.entry-param-badge.type-real {
  background-color: var(--param-badge-bg-color-real);
  border: var(--param-badge-border-real); 
}

.entry-param-badge.type-boolean {
  background-color: var(--param-badge-bg-color-boolean);
  border: var(--param-badge-border-boolean);
}

.entry-param-badge.type-string {
  background-color: var(--param-badge-bg-color-string);
  border: var(--param-badge-border-string);
}

.entry-param-badge.type-image {
  background-color: var(--param-badge-bg-color-image);
  border: var(--param-badge-border-image);
}

.param-type {
  width: 28px;
  height: var(--param-badge-height);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--param-badge-normal-font-size);
  text-align: center;
  overflow: hidden;
  cursor: pointer;
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
</style>
