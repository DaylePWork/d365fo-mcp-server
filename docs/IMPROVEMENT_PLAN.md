# D365FO MCP Server — Improvement Plan

> Ground truth: this entire plan is derived exclusively from the existing codebase
> (`src/`, `docs/`, tests). No training-data assumptions.

## Root Cause Analysis

The server already has a strong foundation:
- Bridge-first three-tier lookup (Bridge → SQLite/FTS5 → Disk parse → Redis)
- 584 k+ symbol index, dual-DB (symbols + labels)
- 54 specialized tools, `runBpCheck` wrapping `xppbp.exe`

**The central gap:** BP rules and X++ grammar live as _prose_ in `systemInstructions.ts`
(600+ lines). The model is _asked_ to follow them — nothing enforces compliance
deterministically. `xppbp.exe` is the only validator: 5-min timeout, Windows-only.
Result: generated code can violate BP before it ever reaches the compiler.

**Confirmed concrete bug:** `codeGen.ts` line 54–56 generates `/// ${name} class` —
exactly the pattern that `BPXmlDocNoDocumentationComments` labels a BP failure.
The generator and the rule set are out of sync.

---

## Pillars

### Pillar 1 — Offline deterministic validator (`validate_xpp`)
**File:** `src/tools/validateXpp.ts`

Encodes the rules already described in `systemInstructions.ts` as executable checks
over X++ source / XML text. Returns `{rule, severity, line, excerpt, fix}[]` — a
machine-readable diff the model can action in one step without a further round-trip.

Rule groups:
| Group | Rules |
|-------|-------|
| SEL — Select grammar | `today()` deprecated, `forceLiterals` banned, `crossCompany` on joined buffer, function call in `where`, nested `while select` |
| COC — Chain of Command | Default param value copied into wrapper, `[ExtensionOf]` class not `final`, class not ending `_Extension` |
| BP — Best Practice | Hardcoded string in `info/warning/error`, `doInsert/doUpdate/doDelete` outside migration context, generic doc-comment (`/// Foo class.`) |
| XML — Table XML | Missing `<AlternateKey>Yes</AlternateKey>` on any index |

All checks are <50 ms, all-platform (no Windows, no `xppbp.exe`).

### Pillar 2 — BP-clean generators
**File:** `src/tools/codeGen.ts` (templates fixed)

Every template that previously emitted `/// ${name} class` is replaced with a
semantically meaningful placeholder. Extension patterns emit the correct skeleton
that passes `BPXmlDocNoDocumentationComments` without modification.

### Pillar 3 — Single-round context aggregator (`prepare_change`)
**File:** `src/tools/prepareChange.ts` + `src/utils/provenanceStore.ts`

One tool call that returns everything needed to safely extend an existing D365FO
object: exact method signature, existing CoC wrappers, CoC eligibility, recommended
strategy, naming validation, and code patterns.

Internally parallelizes up to 6 existing tool queries. Returns a **provenance token**
(SHA-256 hash, 30-minute TTL) that proves the AI looked at the real codebase before
writing code.

**Grounding enforcement (fail-closed):** extension patterns in `generate_code` and
`objectType`-extension variants of `create_d365fo_file` require a valid token.
Enabled by default when `GROUNDING_ENFORCE=true`; bypass with `GROUNDING_ENFORCE=false`
for direct API/human use.

### Pillar 4 — Slim system instructions
**File:** `src/prompts/systemInstructions.ts`

Move detailed grammar rules (select, CoC, SysOperation, FormRun lifecycle, SysDa,
Query Object Model) out of the prompt and into `get_xpp_knowledge` knowledge entries
(already exists, embedded, zero DB access). The prompt becomes a tight decision tree
+ hard prohibitions + a pointer to `get_xpp_knowledge` for rules.

Target: ~35% shorter prompt, no information lost.

---

## Implementation Order

| Phase | Change | Impact |
|-------|--------|--------|
| 1 | `validate_xpp` tool | Offline BP gate, machine-readable output |
| 2 | Fix `codeGen.ts` doc-comments | Templates pass BP without editing |
| 3 | `prepare_change` + provenance store | Single-round grounding, fail-closed |
| 4 | Slim `systemInstructions.ts` | Shorter context, rules in knowledge base |

Each phase is independently mergeable with passing tests.

---

## Invariant Workflow (post-implementation)

```
For extension work:
  prepare_change(goal, objectName) → groundingToken + full context (1 call)
  ↓
  generate_code(..., groundingToken) OR create_d365fo_file(..., groundingToken)
  ↓  (internally calls validate_xpp before returning)
  validate_xpp(generated_code) → violations[] (offline, <50 ms)
  ↓
  if violations → fix in same turn, re-validate (max 1 retry loop)
  ↓
  create_d365fo_file / modify_d365fo_file (writes via bridge)
  ↓
  run_bp_check (on-demand confirmation, not automatic)
```

`build_d365fo_project` and `xppbp.exe` remain on-demand only — they confirm what
the offline gate already caught, without blocking the workflow.
