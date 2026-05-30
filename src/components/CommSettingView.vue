<template>
  <div class="comm-setting-backdrop" @click.self="onClose">
    <div class="comm-setting-dialog">
      <div class="dialog-header">
        <span class="dialog-title">Communication Setting</span>
        <button class="close-btn" @click="onClose"></button>
      </div>
      <div class="dialog-body">
        <label class="row checkbox-row">
          <input type="checkbox" :checked="useTcpIp" @change="useTcpIp = $event.target.checked" />
          <span>Use TCP/IP com. in scripts</span>
        </label>
        <div class="row ip-row" :class="{ disabled: !useTcpIp }">
          <span class="row-label">IP address</span>
          <div class="ip-fields">
            <template v-for="(part, idx) in ipParts" :key="idx">
              <span v-if="idx > 0" class="ip-dot">.</span>
              <input
                class="ip-octet"
                type="text"
                :value="part"
                :disabled="!useTcpIp"
                maxlength="3"
                @input="ipParts[idx] = $event.target.value"
              />
            </template>
          </div>
        </div>
        <div class="row port-row" :class="{ disabled: !useTcpIp }">
          <span class="row-label">Port</span>
          <input
            class="port-input"
            type="text"
            :value="port"
            :disabled="!useTcpIp"
            maxlength="5"
            @input="port = $event.target.value"
          />
        </div>
        <div class="row check-row">
          <button class="check-btn" :disabled="!useTcpIp" @click="checkConnection">
            Check connection
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, inject, onMounted, onBeforeUnmount } from 'vue'

export default {
  name: 'CommSettingView',
  props: {
    entryId: { type: String, required: true }
  },
  emits: ['close'],

  setup(props, { emit }) {
    const socketManager = inject('socketManager')
    const useTcpIp = ref(false)
    const ipParts  = ref(['192', '168', '0', '1'])
    const port     = ref('8080')

    const checkConnection = () => {
      // TODO: implement connection check
    }

    const onClose = async () => {
      if (useTcpIp.value) {
        const host = ipParts.value.join('.')
        const portNum = Number(port.value)
        await socketManager.create(props.entryId, host, portNum)
        await socketManager.connect(props.entryId, host, portNum)
      } else {
        await socketManager.release(props.entryId)
      }
      emit('close')
    }

    const onKeydown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    onMounted(()       => document.addEventListener('keydown', onKeydown))
    onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

    return { useTcpIp, ipParts, port, checkConnection, onClose }
  }
}
</script>

<style scoped>
.comm-setting-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.comm-setting-dialog {
  width: 360px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-bottom: var(--base-outline-border);
  background: var(--left-side-bg-color, #f5f5f5);
}

.dialog-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 20px;
  height: 20px;
  background: var(--close-icon-image) center / contain no-repeat;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
}

.close-btn:hover {
  opacity: 1;
}

.dialog-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.row.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.checkbox-row {
  cursor: pointer;
  font-size: 13px;
  color: #333;
  user-select: none;
}

.checkbox-row input {
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.row-label {
  min-width: 80px;
  font-size: 13px;
  color: #333;
}

.ip-fields {
  display: flex;
  align-items: center;
}

.ip-octet {
  width: 44px;
  padding: 3px 4px;
  font-size: 13px;
  text-align: center;
  border: 1px solid #bbb;
  border-radius: 3px;
  color: #333;
}

.ip-dot {
  margin: 0 2px;
  font-size: 13px;
  color: #333;
}

.port-input {
  width: 80px;
  padding: 3px 6px;
  font-size: 13px;
  border: 1px solid #bbb;
  border-radius: 3px;
  color: #333;
}

.check-row {
  justify-content: center;
}

.check-btn {
  padding: 5px 20px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
}

.check-btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.check-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
