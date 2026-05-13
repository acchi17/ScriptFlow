<template>
  <div class="param-section">
    <div class="param-section-header">Input</div>
    <table class="param-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Data type</th>
          <th>UI type</th>
          <th>Initial value</th>
          <th>Step</th>
          <th>Min</th>
          <th>Max</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="param in inputParams" :key="param.name">
          <td>{{ param.name }}</td>
          <td>{{ formatDataType(param.dataType) }}</td>
          <td>{{ formatCtrlType(param.ctrlType) }}</td>
          <td>{{ param.default ?? '' }}</td>
          <td>{{ param.step ?? '' }}</td>
          <td>{{ param.min ?? '' }}</td>
          <td>{{ param.max ?? '' }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="add-row" @click.stop><span>+</span></div>
  </div>

  <div class="param-section">
    <div class="param-section-header">Output</div>
    <table class="param-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Data type</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="param in outputParams" :key="param.name">
          <td>{{ param.name }}</td>
          <td>{{ formatDataType(param.dataType) }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="add-row" @click.stop><span>+</span></div>
  </div>
</template>

<script>
export default {
  name: 'BlockSettingBlockParams',
  props: {
    inputParams: { type: Array, required: true },
    outputParams: { type: Array, required: true },
  },
  setup() {
    function formatDataType(dt) {
      return dt ? dt.charAt(0).toUpperCase() + dt.slice(1) : '';
    }

    function formatCtrlType(ct) {
      const map = {
        'integer_spinner': 'Spin',
        'real_spinner': 'Spin',
        'check_box': 'Check',
        'combo_box': 'Combo',
        'text_box': 'Text',
      };
      return map[ct] ?? (ct || '');
    }

    return { formatDataType, formatCtrlType };
  }
}
</script>

<style scoped>
.param-section {
  border-top: var(--base-outline-border, 1px solid #ccc);
  padding: 8px 0;
}

.param-section-header {
  padding: 4px 12px 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.param-table th,
.param-table td {
  padding: 4px 8px;
  border: var(--base-outline-border, 1px solid #ccc);
  color: #333;
  white-space: nowrap;
}

.param-table th {
  background-color: rgba(0, 0, 0, 0.04);
  font-weight: 600;
  text-align: left;
}

.param-table td {
  background-color: #fff;
}

.add-row {
  padding: 6px 12px;
  font-size: 18px;
  color: #888;
  cursor: pointer;
  user-select: none;
}

.add-row:hover {
  color: #333;
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
