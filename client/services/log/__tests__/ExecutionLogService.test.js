import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computed } from 'vue';
import ExecutionLogService from '../ExecutionLogService.js';
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js';

// Create a root entry the way useTabStore.createTab() does
function createRoot(entryManager) {
  const rootId = entryManager.addEntry('container', 'root-container');
  entryManager.moveEntry(rootId, null, 0);
  return rootId;
}

// Create a container entry nested inside a parent entry
function createChild(entryManager, parentId, name = 'child') {
  const id = entryManager.addEntry('container', name);
  entryManager.moveEntry(id, parentId, 0);
  return id;
}

describe('ExecutionLogService per-root trees', () => {
  let entryManager;
  let service;
  let rootA;
  let rootB;

  beforeEach(() => {
    entryManager = new EntryHandlerFacade();
    service = new ExecutionLogService(entryManager);
    rootA = createRoot(entryManager);
    rootB = createRoot(entryManager);
  });

  it('files the recipe runs of two roots into two separate trees', () => {
    const childA = createChild(entryManager, rootA, 'child-a');
    const childB = createChild(entryManager, rootB, 'child-b');
    service.addLog(rootA, {}, 'a0');
    service.addLog(childA, {}, 'a1', 'a0');
    service.addLog(rootB, {}, 'b0');
    service.addLog(childB, {}, 'b1', 'b0');

    const treeA = service.getLogs(rootA);
    const treeB = service.getLogs(rootB);
    expect(treeA.rootExecutions.map(e => e.executionId)).toEqual(['a0']);
    expect(treeA.executionsByParent.a0.map(e => e.executionId)).toEqual(['a1']);
    expect(treeA.executionsByParent.b0).toBeUndefined();
    expect(treeB.rootExecutions.map(e => e.executionId)).toEqual(['b0']);
    expect(treeB.executionsByParent.b0.map(e => e.executionId)).toEqual(['b1']);
    expect(treeB.executionsByParent.a0).toBeUndefined();

    expect(service._allExecutions.get('a1').rootEntryId).toBe(rootA);
    expect(service._allExecutions.get('b1').rootEntryId).toBe(rootB);
  });

  it('files a top-level run of a nested entry into its root tree', () => {
    const outer = createChild(entryManager, rootB, 'outer');
    const inner = createChild(entryManager, outer, 'inner');
    service.addLog(inner, {}, 'x1');

    expect(service.getLogs(rootB).rootExecutions.map(e => e.executionId)).toEqual(['x1']);
    expect(service.getLogs(rootA).rootExecutions).toHaveLength(0);
  });

  it('resolves a child record from its parent without calling getRootOf()', () => {
    const child = createChild(entryManager, rootA);
    service.addLog(rootA, {}, 'a0');
    const spy = vi.spyOn(entryManager, 'getRootOf');
    service.addLog(child, {}, 'a1', 'a0');

    expect(spy).not.toHaveBeenCalled();
    expect(service._allExecutions.get('a1').rootEntryId).toBe(rootA);
  });

  it('files records with no resolvable root into the null tree, hidden from getLogs()', () => {
    const noManager = new ExecutionLogService();
    noManager.addLog('e1', {}, 'x1');
    expect(noManager._trees.get(null).rootExecutions).toHaveLength(1);

    service.addLog('unknown-entry', {}, 'x2');
    expect(service._trees.get(null).rootExecutions.map(e => e.executionId)).toEqual(['x2']);
    expect(service.getLogs(null).rootExecutions).toHaveLength(0);
    expect(service.getLogs(undefined).rootExecutions).toHaveLength(0);
  });

  it('returns an empty tree for a root with no records', () => {
    const tree = service.getLogs(rootA);
    expect(tree.rootExecutions).toHaveLength(0);
    expect(Object.keys(tree.executionsByParent)).toHaveLength(0);
    expect(service._trees.has(rootA)).toBe(false);
  });
});

describe('ExecutionLogService.updateLog', () => {
  let entryManager;
  let service;
  let rootA;

  beforeEach(() => {
    entryManager = new EntryHandlerFacade();
    service = new ExecutionLogService(entryManager);
    rootA = createRoot(entryManager);
  });

  it('updates result and execTime of a top-level and a child record', () => {
    service.addLog(rootA, {}, 'x1');
    service.addLog('b1', {}, 'x2', 'x1');
    service.updateLog('x2', { success: false });

    const tree = service.getLogs(rootA);
    expect(tree.executionsByParent.x1[0].result).toEqual({ success: false });
    expect(typeof tree.executionsByParent.x1[0].execTime).toBe('number');
    expect(tree.rootExecutions[0].result).toBeNull();

    service.updateLog('x1', { success: true });
    expect(tree.rootExecutions[0].result).toEqual({ success: true });
    expect(tree.rootExecutions[0].execTime).toBeGreaterThanOrEqual(0);
  });

  it('makes an update visible reactively through getLogs()', () => {
    service.addLog(rootA, {}, 'x1');
    service.addLog('b1', {}, 'x2', 'x1');
    const logs = computed(() => service.getLogs(rootA));

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
    service.addLog(rootA, {}, 'x1');
    expect(service._allExecutions.get('x1')).toBe(service._trees.get(rootA).rootExecutions[0]);
  });

  it('does nothing and does not throw for an unknown execution ID', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    service.addLog(rootA, {}, 'x1');
    expect(() => service.updateLog('unknown', { success: true })).not.toThrow();
    expect(service.getLogs(rootA).rootExecutions[0].result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('ExecutionLogService.clearLogs', () => {
  let entryManager;
  let service;
  let rootA;
  let rootB;

  beforeEach(() => {
    entryManager = new EntryHandlerFacade();
    service = new ExecutionLogService(entryManager);
    rootA = createRoot(entryManager);
    rootB = createRoot(entryManager);
    service.addLog(rootA, {}, 'a0');
    service.addLog('a-child', {}, 'a1', 'a0');
    service.addLog(rootB, {}, 'b0');
    service.addLog('b-child', {}, 'b1', 'b0');
  });

  it('empties only the given root tree and its _allExecutions entries', () => {
    service.clearLogs(rootA);

    const treeA = service.getLogs(rootA);
    expect(treeA.rootExecutions).toHaveLength(0);
    expect(Object.keys(treeA.executionsByParent)).toHaveLength(0);
    expect(service._allExecutions.has('a0')).toBe(false);
    expect(service._allExecutions.has('a1')).toBe(false);

    expect(service.getLogs(rootB).rootExecutions.map(e => e.executionId)).toEqual(['b0']);
    expect(service._allExecutions.has('b0')).toBe(true);
    expect(service._allExecutions.has('b1')).toBe(true);
  });

  it('ignores updateLog() for records cleared before completion, keeping the tree empty', () => {
    service.clearLogs(rootA);
    service.updateLog('a1', { success: true });
    expect(service.getLogs(rootA).rootExecutions).toHaveLength(0);
  });

  it('does nothing for null/undefined or a root with no tree', () => {
    service.addLog('unknown-entry', {}, 'n0');
    service.clearLogs(null);
    service.clearLogs(undefined);
    expect(service._trees.get(null).rootExecutions).toHaveLength(1);

    const rootC = createRoot(entryManager);
    service.clearLogs(rootC);
    expect(service._trees.has(rootC)).toBe(false);
  });
});

describe('ExecutionLogService.removeLogs', () => {
  let entryManager;
  let service;
  let rootA;
  let rootB;

  beforeEach(() => {
    entryManager = new EntryHandlerFacade();
    service = new ExecutionLogService(entryManager);
    rootA = createRoot(entryManager);
    rootB = createRoot(entryManager);
    service.addLog(rootA, {}, 'a0');
    service.addLog('a-child', {}, 'a1', 'a0');
    service.addLog(rootB, {}, 'b0');
  });

  it('deletes the tree and its records, leaving other trees unchanged', () => {
    service.removeLogs(rootA);

    expect(service._trees.has(rootA)).toBe(false);
    expect(service._allExecutions.has('a0')).toBe(false);
    expect(service._allExecutions.has('a1')).toBe(false);
    expect(service.getLogs(rootB).rootExecutions.map(e => e.executionId)).toEqual(['b0']);
    expect(service._allExecutions.has('b0')).toBe(true);
  });

  it('does nothing for an unknown root', () => {
    expect(() => service.removeLogs('unknown-root')).not.toThrow();
    expect(service._trees.size).toBe(2);
    expect(service._allExecutions.size).toBe(3);
  });

  it('does not recreate the tree on updateLog() after removal', () => {
    service.removeLogs(rootA);
    expect(() => service.updateLog('a1', { success: true })).not.toThrow();
    expect(service._trees.has(rootA)).toBe(false);
  });
});

describe('ExecutionLogService per-tree cap', () => {
  let entryManager;
  let service;
  let rootA;
  let rootB;

  beforeEach(() => {
    entryManager = new EntryHandlerFacade();
    service = new ExecutionLogService(entryManager);
    rootA = createRoot(entryManager);
    rootB = createRoot(entryManager);
  });

  it('removes the oldest 100 top-level records of that tree only', () => {
    service.addLog(rootB, {}, 'b0');
    for (let i = 0; i < 1001; i++) {
      service.addLog(rootA, {}, `x${i}`);
    }
    const roots = service.getLogs(rootA).rootExecutions;
    expect(roots).toHaveLength(901);
    expect(roots[0].executionId).toBe('x100');
    expect(roots[roots.length - 1].executionId).toBe('x1000');
    for (let i = 0; i < 100; i++) {
      expect(service._allExecutions.has(`x${i}`)).toBe(false);
    }
    expect(service.getLogs(rootB).rootExecutions.map(e => e.executionId)).toEqual(['b0']);
    expect(service._allExecutions.size).toBe(902);
  });

  it('removes descendants of a removed container from the tree and _allExecutions', () => {
    service.addLog(rootA, {}, 'p0');
    service.addLog('c1', {}, 'p1', 'p0');
    service.addLog('b2', {}, 'p2', 'p1');
    service.addLog('b3', {}, 'p3', 'p0');
    for (let i = 0; i < 997; i++) {
      service.addLog(rootA, {}, `x${i}`);
    }

    const tree = service.getLogs(rootA);
    expect(tree.rootExecutions.some(e => e.executionId === 'p0')).toBe(false);
    expect(tree.executionsByParent.p0).toBeUndefined();
    expect(tree.executionsByParent.p1).toBeUndefined();
    for (const id of ['p0', 'p1', 'p2', 'p3']) {
      expect(service._allExecutions.has(id)).toBe(false);
    }
    expect(tree.rootExecutions).toHaveLength(997 - 99);
  });

  it('caps the null tree the same way', () => {
    for (let i = 0; i < 1001; i++) {
      service.addLog(`unknown-${i}`, {}, `n${i}`);
    }
    expect(service._trees.get(null).rootExecutions).toHaveLength(901);
  });

  it('files a child whose parent was removed by the cap into the null tree', () => {
    for (let i = 0; i < 1001; i++) {
      service.addLog(rootA, {}, `x${i}`);
    }
    service.addLog('late-child', {}, 'late', 'x0');

    expect(service._allExecutions.get('late').rootEntryId).toBeNull();
    expect(service._trees.get(null).executionsByParent.x0.map(e => e.executionId)).toEqual(['late']);
    expect(service.getLogs(rootA).executionsByParent.x0).toBeUndefined();
  });
});

describe('ExecutionLogService reactivity', () => {
  it('re-runs a computed getLogs() when the tree is created, cleared and removed', () => {
    const entryManager = new EntryHandlerFacade();
    const service = new ExecutionLogService(entryManager);
    const rootA = createRoot(entryManager);
    const count = computed(() => service.getLogs(rootA).rootExecutions.length);

    expect(count.value).toBe(0);
    service.addLog(rootA, {}, 'a0');
    expect(count.value).toBe(1);
    service.clearLogs(rootA);
    expect(count.value).toBe(0);
    service.addLog(rootA, {}, 'a1');
    expect(count.value).toBe(1);
    service.removeLogs(rootA);
    expect(count.value).toBe(0);
  });
});
