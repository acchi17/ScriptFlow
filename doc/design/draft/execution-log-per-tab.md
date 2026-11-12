# Execution Log per Tab

Source: Issue #79 "ExecutionLogView per tab"

## Background and Purpose

MainArea supports multiple tabs, and each tab owns one root entry (`useTabStore` `tabs[].rootEntryId`). The execution log, however, is still shared by the whole app:

- `client/main.js` creates a single `ExecutionLogService`. It holds one execution tree (`_executionsTree` = `rootExecutions` + `executionsByParent`) for all tabs.
- `ExecutionLogView.vue` `transformedLogs` lists executions from **all** tabs mixed together. It only hides the root-container rows of the tabs that are currently open (`tabStore.tabs`).
- `ExecutionLogView.vue` `clearLogs()` → `ExecutionLogService.clearLogs()` deletes every tab's logs.
- The 1000-record limit (`ExecutionLogService._maxLogs`) and the batch cleanup (`_cleanupExecutions()`) work on that one shared tree.
- A log record stores only `entryId`. It does not store the tab or root it belongs to.

This shared log was a deliberate choice in `doc/design/completed/main-area-multi-tab.md` (section 4), and per-tab logs were left for later. Now that several recipes can be open at once, mixed logs are hard to read. The goal is that the log panel shows only the executions of the tab the user is working in.

## Functional Requirements

1. **FR-1: One execution tree per root entry.** `ExecutionLogService` keeps a separate execution tree for each root entry (each tab's `rootEntryId`). It no longer keeps one shared tree.
2. **FR-2: Assign the root when the log is created.** When an execution is logged (`addLog()`), the service finds the owning root of the executed entry with `entryManager.getRootOf(entryId)` and files the record under that root's tree. This works the same way for every way an execution can start: from the root (`RecipeItem.vue` `executeRecipe()`) or from a single block/container (`BlockItem.vue`, `ContainerItem.vue`). Child executions (with `parentExecutionId`) go into the same tree as their parent.
3. **FR-3: Updates go to the right tree.** `updateLog(executionId, result)` updates the record in whichever root tree it was filed under.
4. **FR-4: The log view shows only the active tab.** `ExecutionLogView` shows only the execution tree of the active tab (`useTabStore` `activeTab.rootEntryId`). When the user switches tabs, the displayed log switches to the new tab's log. When no tab is open, the view is empty. The current display rules stay as they are: newest first, sandwich-style container rows, and the active tab's own root-container row hidden while its children are listed.
5. **FR-5: Clear works on the active tab only.** The `Clear` button in `ExecutionLogView` deletes only the active tab's logs. Logs of other tabs are kept.
6. **FR-6: Closing a tab discards its logs.** When a tab is closed (`useTabStore.closeTab()`), the execution tree of its root entry is discarded.
7. **FR-7: The panel open/closed state stays global.** `showLog` / `toggleLog()` in `useSystemState.js` stays one global flag shared by all tabs. Only the content of the panel follows the active tab.
8. **FR-8: The record cap stays global.** The 1000-record cap (`_maxLogs`) still counts records across **all** root trees together, so memory use stays bounded the same way it is today. When the cap is exceeded, the oldest records are removed in batches (`_cleanupBatchSize`).

## Out of Scope

- An "All tabs" view, a tab column, or a tab filter in the log view (issue answer 1: A).
- Keeping or showing logs of closed tabs (answer 3: A).
- Remembering the log panel's open/closed state per tab (answer 4: A).
- A separate record cap for each tab (answer 5: A).
- Saving logs to disk or exporting them.
- Changing which columns the log table shows or how it formats them.
- Clearing logs as part of `RecipeItem.vue` `clearRecipe()` (clearing the recipe's entries). Today that does not touch the log, and that stays the same.

## Acceptance Criteria

| # | Criterion | FR |
|---|---|---|
| AC-1 | After running recipe A in tab 1 and recipe B in tab 2, the service holds two separate trees keyed by the two `rootEntryId`s, and neither tree contains records of the other. | FR-1, FR-2 |
| AC-2 | When a single block or container is run inside tab 2 (not the whole recipe), its records, including child records, go into tab 2's tree. | FR-2 |
| AC-3 | When an execution finishes, its result and execution time appear on the record in the correct tab's tree. | FR-3 |
| AC-4 | With tab 1 active, the log view lists only tab 1's executions. After switching to tab 2, it lists only tab 2's. With no tabs open, it is empty. The active tab's root-container row is hidden and its children are listed, as they are today. | FR-4 |
| AC-5 | Pressing `Clear` while tab 1 is active empties tab 1's log. Tab 2's log is unchanged when the user switches to it. | FR-5 |
| AC-6 | After a tab is closed, its tree no longer exists in `ExecutionLogService`, and the other tabs' trees are unchanged. | FR-6 |
| AC-7 | When the log panel is open and the user switches tabs, the panel stays open and shows the new tab's log. Toggling it closed hides it for every tab. | FR-7 |
| AC-8 | When the total number of records across all tabs goes over 1000, the total is brought back to 1000 or fewer by removing the oldest top-level executions (with their descendants) across all tabs. The only exception is a single top-level execution that is still being recorded and alone has more than 1000 records; it is not removed by the cleanup. | FR-8 |
| AC-9 | Unit tests (`client/components/__tests__/ExecutionLogView.test.js`, a new `client/services/log/__tests__/ExecutionLogService.test.js`, and `client/stores/__tests__/useTabStore.test.js`) are updated or added to cover AC-1 to AC-8, and `npm test` passes. | all |

## Design Considerations

### [Resolved] Meaning of "per tab"
Decision: the panel shows only the active tab's executions, and switching tabs switches the content. There is no "All tabs" mode and no tab column (hearing answer 1: A).
Reason: this is the simplest model and it matches how the user works on one recipe at a time.

### [Resolved] Scope of the Clear button
Decision: `Clear` deletes only the active tab's logs (answer 2: Yes).
Reason: once only the active tab's log is visible, deleting logs the user cannot see would be surprising.

### [Resolved] Logs of a closed tab
Decision: they are discarded together with the tab (answer 3: A).
Reason: with the active-tab-only view, there is no way to show them anymore.

### [Resolved] Panel visibility (`showLog`)
Decision: it stays one global toggle (answer 4: A).
Reason: this keeps the current UI. Only the content depends on the tab.

### [Resolved] Record cap
Decision: there is one cap of 1000 records across all tabs (answer 5: A).
Reason: it is the simplest option and keeps the same memory bound as today.

### [Resolved] Data structure in `ExecutionLogService`
Decision: the service holds separate execution trees per root entry (the user's own comment on the issue), for example a reactive map `rootEntryId → { rootExecutions, executionsByParent }`. It does not keep one shared tree that gets filtered by root.
Reason: the user asked for it explicitly. It also makes per-tab Clear and discarding on tab close simple: just delete that root's tree.

### [Resolved] Service API shape
Decision: option A (chosen on the issue). The service gets `rootEntryId` parameters: `getLogs(rootEntryId)`, `clearLogs(rootEntryId)`, and a new `removeLogs(rootEntryId)`. `addLog()` / `updateLog()` keep their signatures and resolve the root internally.
- `getLogs(rootEntryId)` returns a readonly reactive view of that root's tree. It returns an empty tree when the root has no records or `rootEntryId` is `null`/`undefined`. `ExecutionLogView` uses `computed(() => executionLogService.getLogs(tabStore.activeTab?.rootEntryId))`, so the content follows the active tab.
- `clearLogs(rootEntryId)` empties that root's tree. `removeLogs(rootEntryId)` deletes the tree and its key; it is the hook called on tab close.
- Option B (`getLogs()` returns the whole map, the view picks `map[activeRootId]`) is not used, because it exposes the internal structure to the view.
Reason: the view does not depend on the internal map, and the API is easy to unit-test.

### [Resolved] How `updateLog()` finds the right tree
Decision: option A. The service keeps an index `executionId → rootEntryId`. It is filled in `addLog()`, and its entries are removed whenever records are removed (cap cleanup, `clearLogs()`, `removeLogs()`).
Reason: the lookup does not depend on the entry still existing and does not scan every tree. The same index is reused to resolve the root of child records (next point). Execution IDs are already unique across tabs: `client/main.js` creates one `EntryExecutionService` for all tabs, and `EntryExecutionService._generateExecutionId()` combines `_sessionId` with a sequence counter shared by all tabs.

### [Resolved] Where the root is resolved, and executions whose root cannot be found
Decision: options A + C. The root is resolved inside `ExecutionLogService.addLog()`; `EntryExecutionService` is not changed.
- A record with `parentExecutionId` uses its parent's root, taken from the `executionId → rootEntryId` index.
- A top-level record, or a child whose parent is no longer in the index, uses `entryManager.getRootOf(entryId)`.
- If no root can be found (no `entryManager`, as in some tests, or `getRootOf()` returns nothing), the record goes into a fallback tree under the key `null`. The view never shows it, because `activeTab.rootEntryId` is never `null`. It counts toward the global cap like any other tree and is removed by the cap cleanup like any other tree.
Reason: no signature change in `EntryExecutionService`, a child always lands in the same tree as its parent, and records are never dropped silently.

### [Resolved] How the global cap removes records across trees
Decision: option A. When the total goes over `_maxLogs`, the service removes the globally oldest top-level executions (compared by `timestamp`, together with their descendants) across all trees, up to `_cleanupBatchSize` of them. If the total is still above the cap after that batch, it keeps removing the oldest top-level executions until the total is at or below the cap.
- Exception: the top-level execution that the new record belongs to is never removed by this cleanup, so a running execution cannot lose its own parent records. If that one execution alone has more than `_maxLogs` records, the total may stay above the cap until the next cleanup after it ends (AC-8 is worded accordingly).
- The service keeps a running total counter (updated on add, cleanup, `clearLogs()` and `removeLogs()`) instead of recounting every tree on each `addLog()` (`_getExecutionCount()`).
Reason: it keeps today's "oldest first" behavior, is fair across tabs, and the merge only runs across ≤10 tree heads.

### [Resolved] Who discards the tree when a tab is closed
Decision: option A. `useTabStore.closeTab()` calls `executionLogService.removeLogs(rootEntryId)`. The store gets the service with `inject('executionLogService')`, like the other services. The store tests (`client/stores/__tests__/useTabStore.test.js`, `useTabStore.recipe.test.js`) must then provide `executionLogService` (a stub is enough).
Reason: `closeTab()` is already the single place where a tab's resources (socket, runner, root entry) are released, and the store's doc comment requires roots to be removed only there. `openRecipeInNewTab()` closes the tab when restoring fails, so it is covered automatically.

### [Resolved] Executions still running when the tab changes or closes
Decision: `updateLog()` does nothing (no tree re-creation, no exception) when the `executionId` is not in the index or the record no longer exists. A child `addLog()` whose parent's tree was removed falls back to `getRootOf()` as described above. This is covered by a unit test.
Reason: `MainArea.vue` sets `pointer-events: none` on `.main-content` while `isExecuting` is true, so switching or closing tabs during a run is normally blocked. This rule is only a safety net.

### [Resolved] Effect on existing tests
Decision:
- Rewrite `client/components/__tests__/ExecutionLogView.test.js` for the per-root API: the stub `getLogs(rootEntryId)` returns per-root trees. Cover tab switching (AC-4), `Clear` calling `clearLogs()` with the active tab's `rootEntryId` (AC-5), and hiding only the active tab's root-container row.
- Add `client/services/log/__tests__/ExecutionLogService.test.js` (there are no service tests today) for AC-1 to AC-3, AC-6, AC-8, the `null` fallback tree, and the tolerant `updateLog()`.
- Extend `client/stores/__tests__/useTabStore.test.js` to check that `closeTab()` calls `removeLogs()` with the closed tab's `rootEntryId`.
- No Playwright e2e test, because this behavior does not depend on real layout or drag-and-drop.
Reason: unit tests cover every acceptance criterion at the lowest cost.
