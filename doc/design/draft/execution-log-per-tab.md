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
8. **FR-8: The record cap applies to each tree.** The 1000-record cap (`_maxLogs`) applies to each root tree separately. When a tree goes over the cap, the oldest top-level executions of **that tree** (with all their descendants) are removed in batches (`_cleanupBatchSize`). Other trees are not touched. Memory use is bounded by 1000 records per tree: at most 10 tabs plus the `null` fallback tree, so up to 11,000 records.

## Out of Scope

- An "All tabs" view, a tab column, or a tab filter in the log view (issue answer 1: A).
- Keeping or showing logs of closed tabs (answer 3: A).
- Remembering the log panel's open/closed state per tab (answer 4: A).
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
| AC-8 | When one tab's tree goes over 1000 records, the oldest top-level executions of that tree (with their descendants) are removed in a batch, and the other tabs' trees are unchanged. The removed records are also gone from `_allExecutions`. As today, the tree can stay above 1000 only when its remaining top-level executions are too few to remove (for example, one execution that alone has more than 1000 records). | FR-8 |
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
Decision: the 1000-record cap (`_maxLogs`) applies to each execution tree separately. This replaces the earlier hearing answer 5: A (one global cap); the user changed it on the issue.
Reason: each tree can be capped on its own with today's logic, and no cleanup across trees is needed. One tab's runs never remove another tab's logs. The memory bound grows from 1000 to 1000 per tree (at most 10 tabs plus the `null` tree), which is acceptable.

### [Resolved] Data structure in `ExecutionLogService`
Decision: the service holds separate execution trees per root entry (the user's own comment on the issue), for example a reactive map `rootEntryId → { rootExecutions, executionsByParent }`. It does not keep one shared tree that gets filtered by root.
Reason: the user asked for it explicitly. It also makes per-tab Clear and discarding on tab close simple: just delete that root's tree.

### [Resolved] Service API shape
Decision: option A (chosen on the issue). The service gets `rootEntryId` parameters: `getLogs(rootEntryId)`, `clearLogs(rootEntryId)`, and a new `removeLogs(rootEntryId)`. `addLog()` / `updateLog()` keep their signatures and resolve the root internally.
- `getLogs(rootEntryId)` returns a readonly reactive view of that root's tree. It returns an empty tree when the root has no records or `rootEntryId` is `null`/`undefined`. `ExecutionLogView` uses `computed(() => executionLogService.getLogs(tabStore.activeTab?.rootEntryId))`, so the content follows the active tab.
- `clearLogs(rootEntryId)` empties that root's tree. `removeLogs(rootEntryId)` deletes the tree and its key; it can be used when a tab closes.
- Option B (`getLogs()` returns the whole map, the view picks `map[activeRootId]`) is not used, because it exposes the internal structure to the view.
Reason: the view does not depend on the internal map, and the API is easy to unit-test.

### [Resolved] How `updateLog()` finds the right tree
Decision: option D (proposed by the user on the issue). `updateLog(executionId, result)` gets only the execution ID, so the service keeps a flat dictionary `_allExecutions`: `executionId → execution object`. `addLog()` registers each new execution object in it, and `updateLog()` gets the object from it directly and updates it in place. No tree lookup is needed at all.
- The execution object also stores `rootEntryId`, set in `addLog()`. A child record then gets its parent's root from `_allExecutions[parentExecutionId].rootEntryId` (see "Where the root is resolved").
- The dictionary must hold the reactive proxy of the object, for example `shallowReactive(execution)`, not the raw object. If `updateLog()` changes the raw object, `ExecutionLogView` is not updated. `shallowReactive` is enough because `updateLog()` only replaces top-level properties (`result`, `execTime`). The same proxy is pushed into the tree, and Vue keeps shallow proxies as is inside deep-reactive containers.
  - This stays correct only while `updateLog()` (and any other code) replaces top-level fields instead of mutating inside them (for example `execution.result.output = …`). If that changes, use `reactive(execution)` instead.
- The dictionary itself is a plain `Map`, not reactive. Nothing renders from it.
- Entries must be deleted in every removal path: cap cleanup (`_removeExecution()`), `clearLogs(rootEntryId)` and `removeLogs(rootEntryId)`. If one is missed, the removed object stays in memory and `updateLog()` silently updates an object that is no longer shown.
- Execution IDs are unique across tabs: there is one `EntryExecutionService` (`client/main.js`), and `_generateExecutionId()` uses `_sessionId` plus one shared counter.
- Options not used:
  - A. Keep an index `executionId → rootEntryId`, filled in `addLog()` and removed during cleanup, clear, and tab removal. D has the same sync cost but stores the object instead of the root ID.
  - B. Search all trees (`_findExecution` over every root). There are at most 10 tabs and 1000 records in total. Simpler, but every update needs a search.
  - C. Resolve with `entryManager.getRootOf(entryId)`. This fails if the entry was deleted while it was running, and `updateLog` does not get `entryId` anyway.

Reason: `updateLog()` and the child-root lookup both become one dictionary access, and `_findExecution()` can be removed.

### [Resolved] Where the root is resolved, and executions whose root cannot be found
Decision: option A combined with C, with a `null` fallback key (chosen on the issue).
- `ExecutionLogService.addLog()` resolves the root itself. The signatures of `addLog()` and of `EntryExecutionService` stay unchanged. The service already receives `entryManager` in its constructor (`client/main.js` `new ExecutionLogService(entryManager)`).
- A top-level record (no `parentExecutionId`) gets its root from `entryManager.getRootOf(entryId)`.
- A child record (with `parentExecutionId`) is filed under its parent's root and does not call `getRootOf()` again, so a parent and its children always land in the same tree. The parent's root is read from `_allExecutions[parentExecutionId].rootEntryId` (see "How `updateLog()` finds the right tree").
- If no root is found (no `entryManager`, as in tests, or `getRootOf()` returns nothing), the record goes into a fallback tree under the `null` key. The view never shows that key, because `getLogs(null)` returns an empty tree (see "Service API shape"). The `null` tree has its own per-tree cap, so its old records are removed like those of any other tree.
- Option B (`EntryExecutionService.executeEntry()` passes `rootEntryId` to `addLog()`) is not used.
Reason: no change to the `EntryExecutionService` API, parent and children never end up in different trees, and records are never dropped silently.

### [Resolved] How the cap removes records
Decision: the cap is applied per tree (the user's choice on the issue, see "Record cap"). Options A to C of the earlier "global cap across trees" point (globally oldest first, largest tree first, tree that just received the record) are no longer needed.
- After `addLog()` files a record into a tree, it counts the records of **that tree only**. If the count is over `_maxLogs`, `_cleanupExecutions(tree, _cleanupBatchSize)` removes the oldest top-level executions of that tree, as it does today. No merge across trees and no running total counter are needed. Counting one tree (at most about 1000 records) on each `addLog()` costs the same as today.
- `_getExecutionCount()`, `_cleanupExecutions()` and `_removeExecution()` take the tree as a parameter instead of using one shared `_executionsTree`.
- `_removeExecution()` must also delete each removed execution and its descendants from `_allExecutions` (see "How `updateLog()` finds the right tree").
- The `null` fallback tree has its own cap like any other tree.
- Same as today, only whole top-level executions are removed, in one batch per `addLog()`. A tree can therefore stay above the cap when one top-level execution alone has more than 1000 records. AC-8 allows this. If that execution is still running, it can be removed with its children; later child records then find no parent in `_allExecutions` and go into the `null` tree, and `updateLog()` for removed records does nothing (see "Executions still running").
Reason: it is simpler than any cross-tree option. It reuses today's cleanup logic per tree, and one tab's executions never remove another tab's logs.

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
- **Recommendation:** rewrite them for the per-root API, and add tests for tab switching, per-tab Clear, removal on tab close, and the per-tree cap (a full tree is trimmed, other trees are unchanged). A Playwright e2e test is optional, because this behavior does not depend on real layout or drag-and-drop.
