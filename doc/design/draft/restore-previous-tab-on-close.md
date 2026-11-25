# Restore the Previously Active Tab When the Active Tab Is Closed

Issue: #92

## Background and Purpose

When the active tab is closed, `useTabStore.closeTab()` (`client/stores/useTabStore.js`) currently activates the **leftmost remaining tab** (`tabs[0]`). This rule was decided in `doc/design/completed/main-area-multi-tab.md` (section 6, "タブ削除後のアクティブタブ") and is covered by the `useTabStore.test.js` test "activates tabs[0] when the active tab at index %i is closed".

The user wants the tab that was active **before** the closed one to become active instead, so that closing a tab takes them back to where they were, as most tabbed applications do.

Facts from the code that shape the requirements:

- Every tab becomes active when it is created (`createTab()` calls `setActiveTab()`), so every existing tab has been active at least once.
- All changes of the active tab go through `useTabStore.setActiveTab()` (tab click in `MainArea.vue`, `createTab()`, `closeTab()`).
- `openRecipeInNewTab()` closes the tab it just created when restoring fails (`closeTab(tab.id)` in its `catch`). The completed design explicitly accepted that this does *not* return to the tab that was active before the Load; this feature changes that.
- `closeTab()` awaits `entryExecutionService.deleteComm()` and `shutdownRunner()` before it removes the tab, so the active tab can change (user click) between the call and the removal.

## Functional Requirements

1. **FR1 – Activation history.** `useTabStore` keeps the activation history of the tabs, most recently activated first. Activating a tab (through `setActiveTab()`, including from `createTab()`) moves it to the front of the history. Each tab appears in the history at most once.
2. **FR2 – Closing the active tab.** When the active tab is closed, the most recently activated tab that still exists becomes active. If the tab activated just before the closed one has also been closed already, the one before it is used, and so on.
3. **FR3 – Closing the last tab.** When the closed tab was the only tab, the active tab becomes `null` (unchanged from today).
4. **FR4 – Closing an inactive tab.** When an inactive tab is closed, the active tab does not change (unchanged from today). The closed tab is removed from the history.
5. **FR5 – Load failure.** When `openRecipeInNewTab()` closes its newly created tab because restoring failed, the tab that was active before the Load becomes active again (this follows from FR2 with no special handling).
6. **FR6 – In memory only.** The history lives only in memory; it is not saved and does not survive an app restart.

## Out of Scope

- Persisting the history across restarts.
- New navigation features based on the history (e.g. Ctrl+Tab "most recently used" switching, "reopen closed tab").
- Changes to the tab bar UI (`MainArea.vue`) or to tab ordering.
- New e2e tests.

## Acceptance Criteria

Verified by updated unit tests in `client/stores/__tests__/useTabStore.test.js`; the existing test "activates tabs[0] when the active tab at index %i is closed" is replaced.

| # | Criterion | FR |
|---|-----------|----|
| AC1 | Create tabs A, B, C (C active), activate A, close A → C becomes active (not `tabs[0]` = B). | FR1, FR2 |
| AC2 | Create A, B, C; activate A, then B, then C; close B (inactive) and then close C (active) → A becomes active (the closed B is skipped). | FR1, FR2, FR4 |
| AC3 | The result of AC1 does not depend on the position (first/middle/last) of the closed tab. | FR2 |
| AC4 | Closing an inactive tab keeps the active tab (existing test "keeps the active tab when an inactive tab is closed" still passes). | FR4 |
| AC5 | Closing the last remaining tab leaves `tabs` empty, `activeTabId === null` and `visibleTabs` empty (existing test still passes). | FR3 |
| AC6 | With tab A active, `openRecipeInNewTab()` whose restore fails closes the new tab, rethrows the error, and A is active again. | FR5 |
| AC7 | All other existing `useTabStore` tests pass unchanged; `npm test` and `npm run lint` pass. | all |

FR6 needs no dedicated test: it holds as long as the history is not written to any storage.

## Design Considerations

### [Resolved] How much history to remember

Decision: the **full activation history**, most recent first (hearing Q1: A).
Reason: as long as any tab remains, a valid "previous" tab always exists in the history (every tab has been activated at least once), so the behaviour is well-defined without a fallback rule. Remembering only one previous tab would need a fallback as soon as that tab is closed.

### [Resolved] Load failure restores the tab active before the Load

Decision: yes (hearing Q3). The same rule applies to user closes and to the automatic close in `openRecipeInNewTab()`, replacing the exception accepted in `doc/design/completed/main-area-multi-tab.md` (section 6, "失敗時のアクティブタブ").

### [Resolved] Closing an inactive tab

Decision: the active tab does not change; the closed tab is only removed from the history (hearing Q4).

### [Resolved] Scope and acceptance

Decision: memory-only history, no new history-based navigation features, acceptance through `useTabStore` unit tests, no new e2e test (hearing Q5).

### [Open] Safety-net fallback when the history yields no remaining tab

With the full history (FR1) this should not happen while tabs remain, but a defensive rule keeps `closeTab()` correct if the history is ever out of sync (e.g. a future code path changes `activeTabId` without `setActiveTab()`). Hearing Q2 was not answered.

- A: Leftmost tab, `tabs[0]` (the current behaviour). Smallest change, matches the completed design.
- B: The tab to the right of the closed tab, or to its left if none. Closer to browser behaviour, but needs the closed tab's index and is never reached in practice.
- C: The tab to the left, or to its right if none. Same trade-off as B.

Recommendation: **A**. It is a pure safety net, so the simplest rule that keeps today's behaviour is enough.

### [Resolved] How and where the history is stored

Decision: **A** — a plain (non-reactive) array of tab ids inside the `useTabStore` setup closure, like `nextTabIdNumber`. It is not exposed and no rendering depends on it.
Reason: the history is internal bookkeeping for `closeTab()`; tests verify it through `activeTabId` (as in the acceptance criteria). It is the smallest change and does not alter the store's public API or the shape of the tab objects.
It is updated in `setActiveTab()` (move the id to the front, skip when the id is `null`) and in `closeTab()` (remove the closed id in the synchronous part, together with `tabs.value.splice()`).

Rejected alternatives:
- B: A `ref([])` exposed from the store. Visible in Vue devtools and directly assertable in tests, but adds public state no component needs.
- C: An `activatedAt` sequence number on each tab object in `tabs`; pick the remaining tab with the largest value. No separate list to keep in sync, but it adds a field to every tab and needs a scan on close.

### [Open] When the next active tab is decided inside `closeTab()`

`closeTab()` awaits `deleteComm()` and `shutdownRunner()` before removing the tab. The user can activate another tab in the meantime, or close other tabs concurrently.

- A: Decide in the synchronous part after the awaits (where `tabs[0]` is chosen today), using the history at that moment, and only if the closed tab is still active then (as today: `activeTabId.value === tabId`).
- B: Decide at the start of `closeTab()`, before the awaits. Can choose a tab that has been closed or that is stale by the time the tab is removed.

Recommendation: **A**. It keeps the existing "no await between root removal and tab removal" structure and always reflects the latest state.

### [Open] Updating the completed design document

`doc/design/completed/main-area-multi-tab.md` (section 2 `closeTab()` description, section 6 "タブ削除後のアクティブタブ", "テスト" and "失敗時のアクティブタブ") still states the `tabs[0]` rule.

- A: Leave the completed document as a historical record; this design document supersedes it.
- B: Add a short note in those places pointing to this document.

Recommendation: **B**. A one-line note avoids readers taking the outdated rule as current, at almost no cost.
