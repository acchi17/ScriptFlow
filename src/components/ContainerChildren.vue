<template>
  <div class="container-children">
    <div class="drop-area"
         :class="{'is-active': dropAllowed}"
         @drop="(event) => onDrop(event, 0)"
         @dragover="onDragOver"
    />
    <template v-for="(child, index) in children" :key="child">
      <component
        :is="isBlock(child) ? 'BlockItem' : 'ContainerItem'"
        :entry-id="child"
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
    entryId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const {
      isDroppable,
      onDrop,
      onDragOver,
      setOnDropCallback
    } = useDroppable()
    const {
      getChildren,
      addEntry,
      removeEntry,
      reorderEntry,
      moveEntry,
      isBlock,
      hierarchyTick
    } = useEntryOperation()

    const children = computed(() => {
      hierarchyTick.value
      return getChildren(props.entryId)
    })
    const dropAllowed = isDroppable(props.entryId)

    setOnDropCallback((event, index) => {
      const entryType = event.dataTransfer.getData('entryType')
      const entryName = event.dataTransfer.getData('entryName')
      const entryId   = event.dataTransfer.getData('entryId')
      const sourceId  = event.dataTransfer.getData('sourceId')

      if (!entryId) {
        if (entryType === 'block' || entryType === 'container') {
          addEntry(entryType, props.entryId, entryName, index)
        }
      } else if (!sourceId || sourceId === props.entryId) {
        reorderEntry(props.entryId, entryId, index)
      } else {
        moveEntry(entryId, props.entryId, index)
      }
    })

    const removeChild = (id) => {
      removeEntry(id)
    }

    return { children, dropAllowed, onDrop, onDragOver, removeChild, isBlock }
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
