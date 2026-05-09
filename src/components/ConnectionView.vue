<template>
  <svg
    class="connection-view"
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
  >
    <ConnectionItem
      v-for="c in connectionsWithLanes"
      :key="c.id"
      :laneIndex="c.laneIndex"
      :y1="c.y1"
      :y2="c.y2"
      :outputParamName="c.outputParamName"
      :outputEntryId="c.outputEntryId"
      :outputParamCategory="c.outputParamCategory"
      :outputParamType="c.outputParamType"
      :inputParamName="c.inputParamName"
      :inputEntryId="c.inputEntryId"
      :inputParamCategory="c.inputParamCategory"
      :inputParamType="c.inputParamType"
    />
  </svg>
</template>

<script>
import { computed, inject } from 'vue'
import ConnectionItem from './ConnectionItem.vue'

export default {
  name: 'ConnectionView',
  components: { ConnectionItem },

  setup() {
    const entryConnectionManager = inject('entryConnectionManager')
    const entryLayoutManager = inject('entryLayoutManager')

    const connectionsWithLanes = computed(() => {
      const layoutMap = entryLayoutManager.layoutMap
      const connections = entryConnectionManager.getConnections()

      const withCoords = []
      for (const conn of connections) {
        const outLayout = layoutMap.get(conn.output.entryId)
        const inLayout = layoutMap.get(conn.input.entryId)
        if (!outLayout || !inLayout) continue

        const y1 = outLayout.y + outLayout.height / 2
        const y2 = inLayout.y + inLayout.height / 2
        withCoords.push({
          id: conn.id,
          y1,
          y2,
          yMin: Math.min(y1, y2),
          yMax: Math.max(y1, y2),
          outputParamName: conn.output.paramName,
          outputEntryId: conn.output.entryId,
          outputParamCategory: conn.output.category,
          outputParamType: conn.output.dataType,
          inputParamName: conn.input.paramName,
          inputEntryId: conn.input.entryId,
          inputParamCategory: conn.input.category,
          inputParamType: conn.input.dataType,
        })
      }

      withCoords.sort((a, b) => {
        if (a.yMin !== b.yMin) return a.yMin - b.yMin
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      })

      // Greedy interval packing to assign lane indices
      const assigned = [] // { yMin, yMax, laneIndex }
      return withCoords.map(conn => {
        const occupied = new Set(
          assigned
            .filter(a => a.yMin <= conn.yMax && a.yMax >= conn.yMin)
            .map(a => a.laneIndex)
        )
        let laneIndex = 0
        while (occupied.has(laneIndex)) laneIndex++

        assigned.push({ yMin: conn.yMin, yMax: conn.yMax, laneIndex })

        return {
          id: conn.id,
          laneIndex,
          y1: conn.y1,
          y2: conn.y2,
          outputParamName: conn.outputParamName,
          outputEntryId: conn.outputEntryId,
          outputParamCategory: conn.outputParamCategory,
          outputParamType: conn.outputParamType,
          inputParamName: conn.inputParamName,
          inputEntryId: conn.inputEntryId,
          inputParamCategory: conn.inputParamCategory,
          inputParamType: conn.inputParamType,
        }
      })
    })

    return { connectionsWithLanes }
  }
}
</script>

<style scoped>
.connection-view {
  display: block;
  overflow: visible;
}
</style>
