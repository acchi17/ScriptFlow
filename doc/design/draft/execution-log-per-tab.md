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
| AC-8 | When the total number of records across all tabs goes over 1000, the total is brought back to 1000 or fewer by removing the oldest records. The total never grows past the cap after any single `addLog()`. | FR-8 |
| AC-9 | Existing unit tests (`client/components/__tests__/ExecutionLogView.test.js` and the service tests) are updated or extended to cover AC-1 to AC-8, and `npm test` passes. | all |

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

### [Open] Service API shape
The service needs a per-root API. Options:
- A. Add `rootEntryId` parameters: `getLogs(rootEntryId)`, `clearLogs(rootEntryId)`, and a new `removeLogs(rootEntryId)` (or `clearLogs` also deletes the tree's key). `addLog()` / `updateLog()` keep their signatures and resolve the root internally.
- B. `getLogs()` returns the whole map read-only, and the view picks `map[activeRootId]`.
- Trade-offs: A keeps the view unaware of the internal structure and is easy to unit-test. B exposes internals, but one computed property covers reactivity.
- **Recommendation: A.** If `getLogs(rootEntryId)` returns a computed/readonly ref, the view can wrap it in `computed(() => service.getLogs(activeTab?.rootEntryId))` so it re-evaluates when the active tab changes.

### [Open] How `updateLog()` finds the right tree
`updateLog(executionId, result)` gets only the execution ID. Options:
- A. Keep an index `executionId → rootEntryId`, filled in `addLog()` and removed during cleanup, clear, and tab removal.
- B. Search all trees (`_findExecution` over every root). There are at most 10 tabs and 1000 records in total.
- C. Resolve with `entryManager.getRootOf(entryId)`. This fails if the entry was deleted while it was running, and `updateLog` does not get `entryId` anyway.
- **Recommendation: A**, or B if simplicity matters more. Both avoid depending on the entry still existing. Note that execution IDs (`EntryExecutionService._generateExecutionId()`) must be unique across tabs. This should be confirmed during design.

### [Open] Where the root is resolved, and executions whose root cannot be found
FR-2 resolves the root inside `ExecutionLogService.addLog()` through `entryManager.getRootOf(entryId)`. Options:
- A. Resolve inside `addLog()` (no signature change in `EntryExecutionService`).
- B. `EntryExecutionService.executeEntry()` resolves the root (it already does this in `_executeBlock()`) and passes `rootEntryId` to `addLog()`.
- C. Child records use the parent's root (taken from `parentExecutionId`) rather than calling `getRootOf()` again.
- Edge case: if `getRootOf()` returns nothing (the service is used without an `entryManager`, as in tests), the record could be dropped, or it could go into a fallback key such as `null`.
- **Recommendation: A combined with C** (the top-level record calls `getRootOf()`, children inherit the parent's root). Use a `null` fallback key so that records are never lost silently. The view never shows that key.

### [Open] How the global cap removes records across trees
Today `_cleanupExecutions()` removes the oldest top-level executions (with all their descendants) from the single `rootExecutions`. With several trees, options:
- A. Remove the globally oldest top-level executions (by `timestamp`/`startTime`) across all trees until the batch size is reached.
- B. Remove from the tree that has the most records.
- C. Remove from the tree that the new record was added to.
- Trade-offs: A keeps today's "oldest first" behavior and is fair across tabs, at the cost of a merge across ≤10 tree heads. B and C are simpler, but a busy tab could wipe out its own recent history while an idle tab keeps old records (C), or the result is hard to predict (B).
- **Recommendation: A.** Also consider keeping a running total counter instead of recounting everything on each `addLog()` (`_getExecutionCount()`). One more point: today a single huge top-level execution may leave the total above the cap after cleanup (only whole top-level executions are removed). Decide whether AC-8 allows this or whether a loop is needed.

### [Open] Who discards the tree when a tab is closed
Options:
- A. `useTabStore.closeTab()` calls `executionLogService.removeLogs(rootId)`. The store injects `executionLogService` the same way it injects the other services.
- B. `ExecutionLogService` watches `useTabStore().tabs` and prunes trees whose root is gone.
- C. `EntryHandlerFacade.removeEntry()` notifies listeners when a root is removed.
- **Recommendation: A.** `closeTab()` is already the single place where a tab's resources (socket, runner, root entry) are released, and the store's doc comment requires roots to be removed only there. `openRecipeInNewTab()` closes the tab when restoring fails, so it is covered automatically.

### [Open] Executions still running when the tab changes or closes
`MainArea.vue` sets `pointer-events: none` on `.main-content` while `isExecuting` is true, so switching or closing tabs during a run is normally blocked. If the tree is removed while a run is in progress anyway, `updateLog()` must do nothing for the missing record rather than recreate the tree or throw.
- **Recommendation:** make `updateLog()` (and the index from the `updateLog()` point above) tolerant of missing records, and cover it with a unit test.

### [Open] Effect on existing tests
`client/components/__tests__/ExecutionLogView.test.js` and any `ExecutionLogService` tests assume one shared tree and the "hide root rows of all open tabs" rule.
- **Recommendation:** rewrite them for the per-root API, and add tests for tab switching, per-tab Clear, removal on tab close, and the global cap across trees. A Playwright e2e test is optional, because this behavior does not depend on real layout or drag-and-drop.
