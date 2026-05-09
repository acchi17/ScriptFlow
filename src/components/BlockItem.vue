<template>
  <div
    class="block-item"
    :class="{ 'dragging': isDragging, 'selected': isSelected }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click.stop="onSelect"
  >
    <div class="block-content">
      <div class="block-header" :data-entry-id="entry.id">
        <div class="entry-spacer"/>
        <div class="entry-text">{{ entry.name }}</div>
        <div class="entry-button entry-button-play"
            :class="{ 'entry-button--hidden': !isSelected }" @click.stop="onPlay"></div>
        <div class="entry-button entry-button-delete" @click.stop="onRemove"></div>
        <div class="block-header-tail">
          <div
            v-if="(isSelected || isConnectingTgt) && hasParams"
            class="block-content-param"
            :class="{ 'selected': isSelected }"
          >        
            <EntryParamsRow :entry-id="entry.id" :is-connecting-tgt="isConnectingTgt" />
          </div>            
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, inject } from 'vue'
import { useDraggable } from '../composables/useDraggable'
import { useEntryExecution } from '../composables/useEntryExecution'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useSystemState } from '../composables/useSystemState'
import EntryParamsRow from './EntryParamsRow.vue'

export default {
  name: 'BlockItem',
  components: {
    EntryParamsRow
  },
  props: {
    entry: {
      type: Object,
      required: true
    }
  },
  emits: ['remove'],

  setup(props, { emit }) {
    const entryParamManager = inject('entryParamManager')

    // Get composables
    const {
      isDragging,
      onDragStart,
      onDragEnd,
      setOnDragStartCallBack
    } = useDraggable()
    const { executeEntry } = useEntryExecution()
    const { getParentId } = useEntryOperation()
    const {
      isExecuting,
      getSelectedEntryId,
      setSelection,
      clearSelection,
      isConnectingTarget
    } = useSystemState()

    // Selection handling
    const isSelected = computed(() => {
      const selectedId = getSelectedEntryId.value
      return selectedId === props.entry.id
    })

    const isConnectingTgt = isConnectingTarget(props.entry.id)

    const hasParams = computed(() =>
      Object.keys(entryParamManager.getInputParamTypes(props.entry.id)).length > 0 ||
      Object.keys(entryParamManager.getOutputParamTypes(props.entry.id)).length > 0
    )

    const onSelect = () => {
      if (isSelected.value) {
        clearSelection()
      } else {
        setSelection(props.entry)
      }
    }
    
    // Set callback for drag start
    setOnDragStartCallBack((event) => {
      // Get parent ID
      const parentId = getParentId(props.entry.id)

      // Set data for transfer
      event.dataTransfer.setData('entryType', 'block')
      event.dataTransfer.setData('entryId', props.entry.id)
      event.dataTransfer.setData('sourceId', parentId || '')
      
      event.stopPropagation()
    })

    /**
     * Process when the play button is clicked
     */
    const onPlay = async () => {
      // Skip if already executing
      if (isExecuting.value) {
        console.log('Another entry is currently executing, please wait')
        return
      }
      
      try {
        // Execute the entry using EntryExecutionService
        await executeEntry(props.entry)
        console.log('Block execution completed')
      } catch (error) {
        console.error('Error executing block:', error)
      }
    }
    
    /**
     * Process when the remove button is clicked
     */
    const onRemove = () => {
      emit('remove', props.entry.id)
    }
    
    // Return values and methods to use in <template>
    return {
      isDragging,
      isSelected,
      isConnectingTgt,
      hasParams,
      onDragStart,
      onDragEnd,
      onSelect,
      onPlay,
      onRemove
    }
  }
}
</script>

<style scoped>
.block-item {
  height: fit-content;
  width: fit-content;
  border: var(--entry-border);
  border-radius: var(--entry-border-radius);
  box-shadow: var(--entry-box-shadow);
  background-color: var(--block-bg-color);
}

.block-item.dragging {
  opacity: 0.5;
}

.block-item.selected {
  border: var(--entry-select-border);
  box-shadow: var(--entry-select-box-shadow);
}

.block-content {
  height: 100%;
  width: 100%;
  padding: 0 10px;
}

.block-header {
  height: var(--entry-header-height);
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
}

.block-header-tail {
  position: relative;
  height: 100%;
  width: 1px;
}

.block-content-param {
  position: absolute;
  top: 0;
  left: 20px;
  height: var(--entry-header-height);
  padding: 0px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  border: var(--entry-border);
  border-radius: var(--entry-border-radius);
  box-shadow: var(--entry-box-shadow);
  background-color: var(--block-bg-color);
}

.block-content-param.selected {
  border: var(--entry-select-border);
  box-shadow: var(--entry-select-box-shadow);
}

.entry-spacer {
  width: var(--entry-spacer-width);
}

/* Entry text styles */
.entry-text {
  font-size: var(--entry-text-font-size);
  font-weight: var(--entry-text-font-weight);
  color: var(--entry-text-font-color);
  white-space: var(--entry-text-white-space);
  overflow: var(--entry-text-overflow);
  text-overflow: var(--entry-text-text-overflow);
  padding: var(--entry-text-padding);
}

/* Entry button base styles */
.entry-button {
  width: var(--entry-button-size);
  height: var(--entry-button-size);
  border-radius: var(--entry-button-border-radius);
  background-color: var(--entry-button-background-color);
  background-size: var(--entry-button-background-size);
  background-position: var(--entry-button-background-position);
  background-repeat: var(--entry-button-background-repeat);
  cursor: var(--entry-button-cursor);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--entry-button-transition-duration) ease,
              filter var(--entry-button-transition-duration) ease;
}

/* Entry button on press animation */
.entry-button:active {
  transform: scale(var(--entry-button-press-scale));
  filter: brightness(var(--entry-button-press-brightness));
}

/* Play button styles */
.entry-button-play {
  background-image: var(--entry-button-play-image);
}

/* Delete button styles */
.entry-button-delete {
  background-image: var(--entry-button-delete-image);
}

.entry-button--hidden {
  visibility: hidden;
}
</style>
