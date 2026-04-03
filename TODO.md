# cel-tui — TODO

Remaining work and known discrepancies vs `spec.md`.

## Legend

- 🔧 Needs fix (spec violation or bug)
- ❌ Not yet implemented
- 💡 Nice-to-have / future enhancement

---

## Spec Violations

- 🔧 **Tab key consumed by TextInput when focused** — The spec says Tab is an editing key consumed by TextInput (inserts `\t`). Currently Tab always triggers focus traversal. The spec requires Escape to leave the input first, then Tab to traverse. Fix: skip Tab/Shift+Tab focus traversal when a TextInput is focused.

- 🔧 **Mouse wheel scroll inside TextInput** — `findScrollTarget` correctly identifies TextInput as a scroll target, but `cel.ts` scroll handling only updates containers with `overflow: "scroll"`. It should also update TextInput's framework-managed scroll offset when the mouse wheel targets a TextInput.

## Not Yet Implemented

- ❌ Bracketed paste mode support
- ❌ Kitty keyboard protocol detection

## Future Enhancements

- 💡 Additional example apps (chat UI, text editor from spec reference examples)
- 💡 `overflow: "hidden"` as explicit prop (currently all containers clip by default, which matches the spec's default behavior, but the prop value is not checked)
