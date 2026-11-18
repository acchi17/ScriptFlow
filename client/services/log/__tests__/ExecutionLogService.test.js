import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computed } from 'vue';
import ExecutionLogService from '../ExecutionLogService.js';

function createEntryManagerStub() {
  return {
    getEntryName: vi.fn(id => `name-${id}`),
    isContainer: vi.fn(() => false),
  };
}

describe('ExecutionLogService.updateLog', () => {
  let service;

  beforeEach(() => {
    service = new ExecutionLogService(createEntryManagerStub());
  });

  it('updates result and execTime of a top-level record', () => {
    service.addLog('e1', {}, 'x1');
    const result = { success: true };
    service.updateLog('x1', result);

    const record = service.getLogs().value.rootExecutions[0];
    expect(record.result).toEqual(result);
    expect(typeof record.execTime).toBe('number');
    expect(record.execTime).toBeGreaterThanOrEqual(0);
  });

  it('updates result and execTime of a child record', () => {
    service.addLog('c1', {}, 'x1');
    service.addLog('b1', {}, 'x2', 'x1');
    service.updateLog('x2', { success: false });

    const child = service.getLogs().value.executionsByParent.x1[0];
    expect(child.result).toEqual({ success: false });
    expect(typeof child.execTime).toBe('number');
    // Parent is untouched
    expect(service.getLogs().value.rootExecutions[0].result).toBeNull();
  });

  it('makes an update visible reactively through getLogs()', () => {
    const logs = service.getLogs();
    service.addLog('c1', {}, 'x1');
    service.addLog('b1', {}, 'x2', 'x1');

    const topResult = computed(() => logs.value.rootExecutions[0]?.result);
    const childExecTime = computed(() => logs.value.executionsByParent.x1?.[0]?.execTime);
    expect(topResult.value).toBeNull();
    expect(childExecTime.value).toBeNull();

    service.updateLog('x1', { success: true });
    service.updateLog('x2', { success: true });

    expect(topResult.value).toEqual({ success: true });
    expect(typeof childExecTime.value).toBe('number');
  });

  it('stores the same proxy in the tree and in _allExecutions', () => {
    service.addLog('e1', {}, 'x1');
    const raw = service._executionsTree.value.rootExecutions[0];
    expect(service._allExecutions.get('x1')).toBe(raw);
  });

  it('does nothing and does not throw for an unknown execution ID', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    service.addLog('e1', {}, 'x1');
    expect(() => service.updateLog('unknown', { success: true })).not.toThrow();
    expect(service.getLogs().value.rootExecutions[0].result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('ExecutionLogService cap', () => {
  let service;

  beforeEach(() => {
    service = new ExecutionLogService(createEntryManagerStub());
  });

  it('removes the oldest 100 top-level records after 1001 records', () => {
    for (let i = 0; i < 1001; i++) {
      service.addLog(`e${i}`, {}, `x${i}`);
    }
    const roots = service.getLogs().value.rootExecutions;
    expect(roots).toHaveLength(901);
    expect(roots[0].executionId).toBe('x100');
    expect(roots[roots.length - 1].executionId).toBe('x1000');

    for (let i = 0; i < 100; i++) {
      expect(service._allExecutions.has(`x${i}`)).toBe(false);
    }
    for (let i = 100; i <= 1000; i++) {
      expect(service._allExecutions.has(`x${i}`)).toBe(true);
    }
    expect(service._allExecutions.size).toBe(901);
  });

  it('removes descendants of a removed container from the tree and _allExecutions', () => {
    // Oldest top-level execution is a container with nested descendants
    service.addLog('c0', {}, 'p0');
    service.addLog('c1', {}, 'p1', 'p0');
    service.addLog('b2', {}, 'p2', 'p1');
    service.addLog('b3', {}, 'p3', 'p0');
    // Fill up to just over the cap (4 + 997 = 1001)
    for (let i = 0; i < 997; i++) {
      service.addLog(`e${i}`, {}, `x${i}`);
    }

    const tree = service.getLogs().value;
    expect(tree.rootExecutions.some(e => e.executionId === 'p0')).toBe(false);
    expect(tree.executionsByParent.p0).toBeUndefined();
    expect(tree.executionsByParent.p1).toBeUndefined();
    for (const id of ['p0', 'p1', 'p2', 'p3']) {
      expect(service._allExecutions.has(id)).toBe(false);
    }
    // The cap removed p0 plus the 99 oldest flat records
    expect(tree.rootExecutions).toHaveLength(997 - 99);
    expect(service._allExecutions.size).toBe(997 - 99);
  });

  it('ignores updateLog() for a record removed by the cap', () => {
    for (let i = 0; i < 1001; i++) {
      service.addLog(`e${i}`, {}, `x${i}`);
    }
    expect(() => service.updateLog('x0', { success: true })).not.toThrow();
    expect(service._allExecutions.has('x0')).toBe(false);
  });
});

describe('ExecutionLogService.clearLogs', () => {
  it('empties the tree and _allExecutions', () => {
    const service = new ExecutionLogService(createEntryManagerStub());
    service.addLog('c1', {}, 'x1');
    service.addLog('b1', {}, 'x2', 'x1');
    service.addLog('b2', {}, 'x3');

    service.clearLogs();

    const tree = service.getLogs().value;
    expect(tree.rootExecutions).toHaveLength(0);
    expect(Object.keys(tree.executionsByParent)).toHaveLength(0);
    expect(service._allExecutions.size).toBe(0);
  });

  it('ignores updateLog() for records cleared before completion', () => {
    const service = new ExecutionLogService(createEntryManagerStub());
    service.addLog('b1', {}, 'x1');
    service.clearLogs();
    service.updateLog('x1', { success: true });
    expect(service.getLogs().value.rootExecutions).toHaveLength(0);
  });
});
