# Plan: hoist props to an ancestor (`to` option / `data-props-to`)

Status: **done** — shipped in 0.7.11 (steps 1–5 all landed; see CHANGELOG).

## Problem

Element-scoped sources write their props on the bound element. Custom properties
inherit downward only, and `@container style()` matches against an *ancestor* —
so an element can never style-query a prop written on itself, and siblings can't
see it either. `--live-loaded` on an `<img>` is invisible to the img's own style
queries, to a skeleton overlay, and to the `<figcaption>`.

The library has a half-version already: 8 sources (`img`, `img-color`,
`video-color`, `range`, `field`, `select`, `media`, `color-input`) use
`resolveTarget` (src/core/find.ts) — bind a *wrapper*, the source finds the real
element inside, props land on the wrapper. Limits: per-source opt-in, first
matching descendant only, and useless for sources that observe the bound element
itself (`size`, `visibility`, `pointer-local`, `truncated`).

## API

A binding-layer option — sources need **zero changes** (they just call `ctx.write`;
the binding routes the writes):

```ts
propsFor(img, ['img', 'size'], { to: 'figure' })   // string → el.closest(sel)
propsFor(img, ['img'], { to: img.parentElement })  // or an explicit Element
```

```html
<figure>
  <img data-props-for="img size" data-props-to="figure" src="…">
  <figcaption>…</figcaption> <!-- reads --live-loaded, can style-query it -->
</figure>
```

Semantics: **observe** the bound element, **write** to the resolved ancestor.

Decisions (settled during investigation, 2026-07-15):

- `to` as string resolves via `el.closest(sel)`, once at bind time. DOM moves
  re-resolve naturally in `auto` (MutationObserver remove+add → rebind).
- No `closest()` match → `console.warn`, fall back to writing on the element
  itself (props still exist; effect degrades gracefully).
- `to` alongside a **global** key → warn, ignore `to` for that key (globals keep
  writing to `config.root`).
- Dedupe stays keyed `(element, key)`: a second `propsFor` with a different `to`
  while active is ignored (documented).
- **Sibling collision** (two imgs hoisting the same key to the same figure):
  last-write-wins is inherent; worse, disposing one removes the property while
  the survivor's `ctx.write` memo still thinks its value is current, so the prop
  stays gone until the value next changes. V1: document "one binding per key per
  hoist target" + dev-time `console.warn` on duplicate. A `prefix`/`as` naming
  option is the real fix — explicitly out of scope.
- Viewport gating keeps observing the **bound** element ("compute when the img
  is on screen" is still the right trigger). The `target !== config.root` gate
  check is also unchanged.
- `resolveTarget` wrapper pattern stays as-is — complementary ("container finds
  its child" vs "child names its container").

## Implementation steps

### 1. `src/index.ts` — core routing

- `makeContext(target, writeTarget, written, props)`: `ctx.target` stays the
  observed element; `writer.set(writeTarget, …)` inside `write()`.
- `Entry` gains `writeTarget: HTMLElement`; `disposeEntry` uses it for
  `styleFor()` / `writer.forget()` so props are removed from the right element.
- `startOn(target, keys, to?)`: resolve `to` once (Element | closest | fallback
  + warn). Maintain a small module-level `Map<HTMLElement, Set<string>>` of
  writeTarget → hoisted keys purely to emit the duplicate-key warning; clean it
  up in `disposeEntry`.
- `propsFor` overloads gain an optional trailing `opts?: { to?: Element | string }`
  (element-targeted form only). Export the options type.
- Verify: unit tests in step 3.

### 2. `src/auto.ts` — declarative form

- Read `data-props-to`; pass `{ to }` through `bindKey` → `propsFor`.
- Add `data-props-to` to the MutationObserver `attributeFilter`.
- `tracked` becomes `WeakMap<el, { keys: string[]; to?: string }>`; when the
  `to` value changes, unbind **all** tracked keys and rebind (a `to` change
  changes every binding's write target — no per-key delta).
- Verify: auto tests in step 3.

### 3. Unit tests (`test/`, jsdom) — write these first

- hoist: props land on the ancestor, not the bound element; disposal removes
  them from the ancestor.
- string `to` resolves via `closest`; no match → warns + falls back to self.
- `to` + global key → warns, still writes to root.
- second `propsFor` same `(el, key)` different `to` → ignored.
- duplicate hoist (two elements, same key, same write target) → warns.
- auto: `data-props-to` binds hoisted; changing/removing the attribute rebinds;
  removing the element unbinds and cleans the ancestor's props.

### 4. E2E (`e2e/hoist.spec.ts`) — platform proof, belongs in e2e per repo rule

- Bind `img` with `to: figure` in a real engine; assert the `<figcaption>`'s
  computed style resolves `var(--live-loaded)`.
- Prove the style-query round-trip: `@container style(--live-loaded: 1)` rule
  applies to a *sibling* of the img (and to the img itself) once loaded.

### 5. Docs + version (same change — keep surfaces in sync)

- README: `data-props-to` in the declarative section, `opts.to` in the
  imperative API section, a short "hoisting & style queries" example.
- llms.txt: mirror the API addition.
- docs site: extend the relevant page(s) with `data-props-to`.
- demos: add/extend one demo showing a figure skeleton via hoisted
  `--live-loaded` style query (verify via computed styles, not screenshots).
- `package.json`: **patch** bump (additive, 0.x: minor = breaking) +
  `CHANGELOG.md` entry.

## Verification loop

1. Step 3 tests written and failing → steps 1–2 make them pass (`npm test`).
2. `npm run typecheck` clean.
3. `npx playwright test` for step 4 (at least chromium).
4. `npm run build` — confirm no size regression in core bundle beyond the small
   routing change; `auto`/`head` remain the only sideEffects entries.
