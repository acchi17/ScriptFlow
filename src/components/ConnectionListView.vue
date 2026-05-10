<template>
  <div class="connection-list-view" @click.stop>
    <div
      v-for="item in listItems"
      :key="item.connectionId"
      class="connection-list-item"
    >
      <button class="remove-btn" @click.stop="removeConnection(item.connectionId)"></button>
      <span class="item-prefix" :class="`dir-${item.direction}`"></span>
      <span class="item-param-name" :class="item.dataType && `type-${item.dataType}`">{{ item.paramName }}</span>
    </div>
  </div>
</template>

<script>
import { computed, inject } from 'vue'

export default {
  name: 'ConnectionListView',

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
    }
  },

  setup(props) {
    const entryConnectionManager = inject('entryConnectionManager')

    const listItems = computed(() => {
      const connections = entryConnectionManager.getConnectionsByEndpoint(
        props.entryId, props.paramCategory, props.paramName
      )
      return connections.map(conn => ({
        connectionId: conn.id,
        direction: props.paramCategory === 'output' ? 'output' : 'input',
        paramName: props.paramCategory === 'output' ? conn.input.paramName : conn.output.paramName,
        dataType: props.paramCategory === 'output' ? conn.input.dataType : conn.output.dataType
      }))
    })

    const removeConnection = (connectionId) => {
      entryConnectionManager.removeConnection(connectionId)
    }

    return { listItems, removeConnection }
  }
}
</script>

<style scoped>
.connection-list-view {
  position: absolute;
  top: 100%;
  left: -10px;
  z-index: 100;
  min-width: 120px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.connection-list-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: var(--param-badge-compact-font-size);
  color: var(--param-badge-color);
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.remove-btn {
  height: 20px;
  width: 20px;
  background-color: transparent;
  background-image: var(--close-icon-image);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border: none;
  cursor: pointer;
}

.item-prefix {
  width: 20px;
  height: 20px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  flex-shrink: 0;
}

.item-prefix.dir-output {
  background-image: var(--right-2-arrow-icon-image);
}

.item-prefix.dir-input {
  background-image: var(--left-2-arrow-icon-image);
}

.item-param-name {
  padding: 2px 6px;
  border: var(--param-badge-border);
  border-radius: var(--param-badge-border-radius);
}

.item-param-name.type-integer {
  background-color: var(--param-badge-bg-color-integer);
}

.item-param-name.type-real {
  background-color: var(--param-badge-bg-color-real);
}

.item-param-name.type-boolean {
  background-color: var(--param-badge-bg-color-boolean);
}

.item-param-name.type-string {
  background-color: var(--param-badge-bg-color-string);
}

.item-param-name.type-image {
  background-color: var(--param-badge-bg-color-image);
}
</style>
