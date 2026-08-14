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
import { computed, inject } from 'vue'
import { useDroppable } from '../composables/useDroppable'
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
    const entryManager = inject('entryManager')

    const children = computed(() => {
      entryManager.hierarchyTick.value
      return entryManager.getChildren(props.entryId)
    })
    const dropAllowed = isDroppable(props.entryId)

    setOnDropCallback((event, index) => {
      const entryType = event.dataTransfer.getData('entryType')
      const entryName = event.dataTransfer.getData('entryName')
      const entryId   = event.dataTransfer.getData('entryId')
      const sourceId  = event.dataTransfer.getData('sourceId')

      if (!entryId) {
        if (entryType === 'block' || entryType === 'container') {
          const newEntryId = entryManager.addEntry(entryType, entryName)
          entryManager.moveEntry(newEntryId, props.entryId, index)
        }
      } else if (!sourceId || sourceId === props.entryId) {
        entryManager.reorderEntry(props.entryId, entryId, index)
      } else {
        entryManager.moveEntry(entryId, props.entryId, index)
      }
    })

    const removeChild = (id) => {
      entryManager.removeEntry(id)
    }

    const isBlock = (entryId) => entryManager.isBlock(entryId)

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
