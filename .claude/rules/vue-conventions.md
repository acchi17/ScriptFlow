---
paths:
  - "src/components/**/*.vue"
---

# Vue Component Conventions

## Component Structure

Use **Options API with `setup()` function**. Do not use `<script setup>`.
Always declare an explicit `name` property matching the filename exactly.

```js
export default {
  name: 'MyComponent',
  components: { ChildComponent },
  props: { ... },
  emits: [...],
  setup(props, { emit }) {
    // reactive state, computed, watchers, methods
    return { ... }
  }
}
```

> `ExecutionLogView.vue` is a legacy exception that uses `<script setup>`. Migrate it to Options API when refactoring.

## Props

Always use the verbose object syntax. Specify `type`, `required`, and `default` explicitly.
Array shorthand is not allowed.

```js
props: {
  entryId:  { type: String,  required: true },
  disabled: { type: Boolean, default: false },
  count:    { type: Number,  default: 0 }
}
```

## Emits

Always declare `emits` explicitly as an array.

- v-model binding: use the `update:value` pattern
- Custom events: kebab-case names

```js
emits: ['update:value', 'open-setting', 'remove']

// Inside setup:
emit('update:value', newValue)
emit('remove')
```

## Template Patterns

**v-for keys** — always use a unique identifier; use index only as a last resort.

```html
<div v-for="item in items" :key="item.id">
```
