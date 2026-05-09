<template>
  <div class="container-children">
    <div class="drop-area"
        :class="{'is-active': dropAllowed}"
        @drop="(event) => onDrop(event, 0)"
        @dragover="onDragOver"
    />
    <template v-for="(child, index) in children" :key="child.id">
      <component
        :is="child.type === 'block' ? 'BlockItem' : 'ContainerItem'"
        :entry="child"
        @remove="removeChild"
      />
      <div class="drop-area"
          :class="{'is-active': dropAllowed}"
          @drop="(event) => onDrop(event, index + 1)"
          @dragover="onDragOver"
      />
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useDroppable } from '../composables/useDroppable'
import { useEntryOperation } from '../composables/useEntryOperation'
import BlockItem from './BlockItem.vue'
import ContainerItem from './ContainerItem.vue'

export default {
  name: 'ContainerChildren',
  components: {
    BlockItem,
    ContainerItem,
  },
  props: {
    entry: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const {
      isDroppable,
      onDrop,
      onDragOver,
      setOnDropCallBack
    } = useDroppable()
    const {
      addBlock,
      addContainer,
      removeEntry,
      reorderEntry,
      moveEntry
    } = useEntryOperation()

    const children = computed(() => props.entry.children)
    const dropAllowed = isDroppable(props.entry.id)

    setOnDropCallBack((event, index) => {
      const entryType = event.dataTransfer.getData('entryType')
      const entryName = event.dataTransfer.getData('entryName')
      const entryId   = event.dataTransfer.getData('entryId')
      const sourceId  = event.dataTransfer.getData('sourceId')

      if (!entryId) {
        if (entryType === 'block') {
          addBlock(props.entry.id, entryName, index)
        } else if (entryType === 'container') {
          addContainer(props.entry.id, entryName, index)
        }
      } else if (!sourceId || sourceId === props.entry.id) {
        reorderEntry(props.entry.id, entryId, index)
      } else {
        moveEntry(entryId, props.entry.id, index)
      }
    })

    const removeChild = (id) => {
      removeEntry(id)
    }

    return { children, dropAllowed, onDrop, onDragOver, removeChild }
  }
}
</script>

<style scoped>
.container-children {
  width: 100%;
  padding-bottom: 10px;
  display: flex;
  flex-direction: column;
}

.drop-area {
  height: 20px;
  width: 100%;
  border: 1px dashed transparent;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.drop-area.is-active {
  height: 20px;
  border-color: #007bff;
  background-color: rgba(0, 123, 255, 0.1);
}
</style>
