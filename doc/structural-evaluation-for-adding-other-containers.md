# EntryExecutionService: Structural Evaluation for Adding if/Loop Containers

## Context

Currently, a container is a simple object that just executes its own `children` in order. Going forward, we want to add an **if-container** (conditional execution) and a **Loop-container** (repeated execution).

This raised the question: will the current `EntryExecutionService` structure (a dynamic, tree-walking recursive interpreter) still work once these are added, and if so, what needs to change?

## Current Structure Found During Investigation

- `EntryExecutionService.executeEntry(entry)` ([EntryExecutionService.js:141](../client/services/entry_execution/EntryExecutionService.js#L141)) is a recursive dispatcher that checks `entry.type` (`'block'` | `'container'`) and routes to `_executeBlock` / `_executeContainer`.
- `_executeContainer` ([EntryExecutionService.js:108](../client/services/entry_execution/EntryExecutionService.js#L108)) unconditionally runs all of `container.children` from start to end via `for...of` + `await`. There is no step that pre-builds an execution order list — "what to run next" is decided on the spot, each time = a **dynamic (tree-walking interpreter) approach**.
- Parameter resolution (`_resolveInputParams`) also reads values from `EntryParamManager`/`EntryConnectionManager` fresh on every call; nothing is pre-resolved or cached.
- `Entry`/`Container`/`Block` form a simple one-level inheritance ([Entry.js](../client/models/Entry.js), [Container.js](../client/models/Container.js), [Block.js](../client/models/Block.js)).
- The check `entry.type === 'container'` is **duplicated independently** across `EntryManager` (~10 places), `ContainerChildren.vue`, `RecipeSerializer`/`RecipeDeserializer`, and `EntryExecutionService`. There is no centralized `isContainer()` helper.
- `EntryConnectionManager`'s connection-validity check relies on a **static DFS sequence number over the tree shape**, computed by `EntryManager._rebuildSequenceNumbers()`, requiring `outputSeq < inputSeq` ([RecipeDeserializer.js:181](../client/services/entry_persistance/RecipeDeserializer.js#L181)). This is not a mechanism for statically fixing execution order — it's merely a **positional validity check** derived from the shape of the tree.
- `EntryDefinitionService` only handles Block definitions (from JSON); there is no equivalent definition schema for container kinds.
- The only cancel/abort mechanism is `EntryExecutionService.terminate()` (stops the entire run) — there is no per-loop or per-branch interruption.

## Three Points That Actually Need Work

1. **Duplicated type checks** — Branches on `entry.type === 'container'` are independently duplicated across `EntryManager`, `ContainerChildren.vue`, `RecipeSerializer`/`Deserializer`, and `EntryExecutionService`. Adding new if/Loop kinds means every one of these spots must be updated without missing any — and `ContainerChildren.vue` in particular has an implicit fallback of "anything other than `'block'` renders as `ContainerItem`," which risks a new kind silently rendering as a plain container. → Type checks should be centralized (e.g., an `isContainer(entry)` helper, or keep `entry.type` as `'container'` while adding a secondary discriminator like `entry.containerKind`).

2. **Make `_executeContainer`'s execution strategy swappable per container kind** — It's currently a hardcoded, unconditional `for...of` loop. Bolting branch/loop conditions onto it with `if`/`else` will bloat `_executeContainer`. The codebase already has a precedent for this: `ScriptExecutionFactory` (which swaps script engines by language). Following the same pattern, a "per-container-kind execution strategy" should be split into small classes and assembled via a factory under `entry_execution`. This strategy is still chosen **at runtime** — it has nothing to do with static compilation.

3. **Connection-order validation (`EntryConnectionManager` + `EntryManager`'s DFS sequence numbers) assumes the tree is static and each node executes exactly once** — this is the one area that genuinely needs revisiting for if/Loop.
   - If-container: output params of blocks inside a branch that wasn't taken remain "unupdated (stale value)." `_resolveInputParams` has no awareness of whether a branch actually ran, so reading a connection from an unexecuted branch would pass a stale value. The UI's connection-validity check (based on tree position) can stay as-is, but the runtime value-resolution side needs a fallback for "treat output from an unexecuted branch as invalid."
   - Loop-container: a "feed last iteration's output into this iteration's input" back-edge within the loop body cannot be expressed by the current forward-only `outputSeq < inputSeq` check. A scoped exception (e.g., allow back-edges only between children of the same Loop-container) needs to be designed.
   - Neither of these is about "statically unrolling the execution order ahead of time" — both are about extending the *connection-validity rules* per container kind while keeping execution dynamic.

## Minor Points Found Along the Way (For Reference Only)

- `Container.js` imports `reactive` from `vue`, which violates the CLAUDE.md rule that "Models must not import from Vue" (a pre-existing deviation — fine to leave as-is for this task, but worth being aware of).
- There is currently no guard against runaway loops (max iteration count, cancellation check). Once Loop-containers exist, the implicit assumption that "execution time is bounded by the number of tree nodes" no longer holds, so this needs consideration during implementation.

## Action

This is a design assessment; no code changes are made here. The three points above (centralizing type checks / making the execution strategy pluggable per container kind / extending connection-order validation) are the design issues to address when if/Loop containers are actually implemented.
