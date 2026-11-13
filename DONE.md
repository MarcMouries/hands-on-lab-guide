# Done

Everything shipped, newest first. Split out of `ROADMAP.md` so that file stays a
list of what is left.

Each line is built, deployed and verified on `marco1creator`. `FEATURES.md`
describes how the built behaviour actually works; this is the record of what was
asked for and when it landed.

Last updated 2026-11-13.

---

## 2026-11-13

| Item | Shipped |
|---|---|
| **Cross-scope privileges declared in the repo** | The 11 `sys_scope_privilege` reads the artifact tracker needs — `sys_update_xml`, `sys_metadata`, `sys_app`, `sys_scope`, `sys_db_object`, `sc_cat_item`, `sys_atf_test`, `sys_hub_flow`, `sys_script`, `sys_script_client`, `sys_ui_policy` — now in `src/fluent/sys-scope-privilege/`, so a fresh install carries them. Seven others the instance had were left undeclared on purpose: they exist only because maintenance scripts were run in-scope, and nothing in the app uses them |
| **`{{instance_url}}` token** | Step content names the instance by token instead of literal text; the value comes from `window.location.origin`, so a clone or a PDI is right with no content edit. Step 2 of the setup task now renders a clickable link |
| **`task_id` is the task's slug** | `&task_id=Explain-existing-code` instead of a sys_id. Six words rather than a plan's four, resolved client-side against the loaded plan. A sys_id still resolves and is rewritten to the slug on load |
| **One URL write per click in authoring** | The portal writes the URL through an Angular digest, so reading the param straight back returns the old value. The first version compared against that stale read and wrote twice — two digests, two visible re-renders per click |
| **The open node is in the authoring URL** | `&node_id=<sys_id>` names what is being edited, so a task, prompt or criterion can be linked; Back and Forward move between visited nodes |
| **Authoring layout** | Markdown textarea fills its column instead of sizing to its own content, `box-sizing: border-box` for the view, the portal grid's ~45px gutters stripped from the wrappers around the app, and the smallest text up a step |
| **Plan content is writable by authors only** | Facilitator dropped from create, write and delete on all five plan tables. A facilitator still reads every plan including drafts, but cannot change one — not in the portal and not in the platform UI. Consequence: assigning a plan's `facilitator` is now an admin job |
| **`x_snc_holg.author` granted** | Role on your user, confirmed working: `?id=authoring` opens. Each further author needs the same grant |

---

## 2026-11-12

| Item | Shipped |
|---|---|
| **Plan authoring UI** | `?id=authoring`: tree of the whole plan, all five levels editable, live Markdown preview using the participant renderer, up/down reordering, delete guarded on participant progress. Six generic REST routes, 34/34 server self-test |
| Participant 900 → sane numbering | Guest band retired; lowest free number, name-derived number kept when free |
| Blank portal page on `?id=home` | Mount race: the bundle was injected before `#react-root` existed and gave up silently. Now waits for the node, and a failed asset load says so on the page |
| Field-type wording in prompts | `choice:` → `one of:`, `single-line text` → `short text`, `checkbox` → `yes or no` |

---

## Earlier

| Item | Shipped |
|---|---|
| Markdown rendering of step content | `react-markdown` 10.1.0, no raw HTML, alt text enforced |
| A whole task as one stepped Markdown document | Outermost ordered list becomes the step timeline; numbers from a CSS counter |
| Per-block Copy button | Copy lives next to each code block; the header button is gone |
| Deep-linkable task (`&task_id=`) | Back/forward works; unknown ids dropped |
| "Steps" heading replacing "Prompt"/"Prompts" | |
| Task descriptions say "Use Now Assist **for Creator** to" | Every task but the claims one |
| Setup task before all existing tasks | Five steps: account, scoped app, Now Assist check, working in scope, naming |
| Per-participant isolation by scoped app | Scope from initials + number: `x_snc_mm04` |
| Participant number assigned at runtime | On plan open, lowest free number first |
| Dynamic setup Step 1 | "You are logged in as … and your participant number is …" via `{{token}}` substitution |
| Per-plan participant list | `x_snc_holg_plan_participant` on `(evaluation_plan, user)`, with number and prefix |
| The 7 prompt edits for multi-participant use | Applied with `{{prefix}}`, each prompt body fenced |
| Impersonation exit returns to the facilitator view | URL allowlist, so `task_id` no longer rides along |
| Facilitator plan choice reflected in the URL | Linkable and survives a refresh |
| Plans addressed by slug, not sys_id | `plan_id=Now-Assist-for-Creator` |
| `FEATURES.md` | Feature inventory, kept current |
