# Hands-On Lab Guide — feature inventory

A running list of what this app does, kept so we can see at a glance what is
built and what changed recently. `README.md` explains the architecture and the
data model; `ROADMAP.md` tracks the open tasks and what needs a decision from
you; this file tracks capability.

| | |
|---|---|
| **Scope** | `x_snc_holg` |
| **Version** | 1.0.0 |
| **Instance** | `https://marco1creator.service-now.com` |
| **Portal** | `/holg` |
| **REST base** | `/api/x_snc_holg/lab` |
| **Last updated** | 2026-11-12 |

---

## 1. Lab authoring

| Feature | Status | Notes |
|---|---|---|
| Evaluation Plan as the unit of a lab | Built | `status=published` gates participant visibility |
| Ordered Plan Sections | Built | `order` integer; sections render ascending |
| Ordered Plan Tasks per section | Built | Carries scenario, description, how-to-test, dependency note |
| Multiple ordered Task Prompts per task | Built | Rendered as the numbered **Steps** of a task |
| Success Criteria checklist per task | Built | Yes/no, the definition of "did this work?" |
| Readable plan slugs in URLs | Built | `Now Assist for Creator` → `Now-Assist-for-Creator` |
| Short URL parameter names | Built *(recent)* | `plan`, `task`, `node`. The former `plan_id` / `task_id` / `node_id` are still accepted on the way in and rewritten on the first write, so links already shared keep working |

### Current content — "Now Assist for Creator"

7 sections, 10 tasks. Section 50 is the environment setup added for the
multi-participant workshop; 100–600 are the Now Assist for Creator exercises.

| Order | Section | Tasks |
|---|---|---|
| 50 | Set up your environment | 1 (5 steps) |
| 100 | Build a catalog item | 1 |
| 200 | Build tests | 2 |
| 300 | Build a playbook | 1 |
| 400 | Build an application | 1 (5 chained prompts) |
| 500 | Build a flow | 1 |
| 600 | Build code | 3 |

---

## 2. Participant experience

| Feature | Status | Notes |
|---|---|---|
| Plan list with per-plan progress | Built | `/holg?id=plans` |
| Plan view: task nav + task panel | Built | `/holg?id=plan&plan=<slug or sys_id>` |
| Automatic enrolment on first open | Built | `GET /plans/{id}` enrols and backfills Task Results |
| Task Result backfilled for new tasks | Built | Adding a task mid-workshop needs no seeding; existing participants pick it up on next load |
| Auto-mark `in_progress` on open | Built | Fires once per task per session |
| Success-criteria checklist | Built | Stays editable after submission, by design |
| Pass/fail verdict + free-text feedback | Built | Verdict is final — `PATCH` returns 409 on a submitted result |
| Live progress bar / percent complete | Built | Recalculated on submit |
| "Next task" advance | Built | Jumps to the next unsubmitted task |
| Copy prompt to clipboard | Built | Copies **raw** `prompt_text`, never rendered text |
| **Markdown rendering of step content** | Built *(recent)* | `react-markdown` 10.1.0 — nested sub-steps, inline code chips, italic NOTE blockquote with accent border, inline screenshots |
| **Deep-linkable task** | Built *(recent)* | `&task=Explain-existing-code` — the task's own slug, six words rather than a plan's four, since task titles are sentences. A sys_id still resolves and is rewritten to the slug on load; where two titles slug alike both fall back to sys_ids. Back/forward works; unknown ids are dropped with `replaceState` |
| **"Steps" heading** | Built *(recent)* | Replaced the "Prompt"/"Prompts" singular-plural switch |
| **Participant number and prefix** | Built *(recent)* | Assigned on enrolment, lowest free number first. Prefix is **initials + number**: `Participant #7` → `p07` → scope `x_snc_p07`; `Marc Mouries` as the fourth person → `mm04` → `x_snc_mm04`. See [Participant numbering](#participant-numbering--how-a-number-is-chosen) |
| **A whole task as one stepped Markdown document** | Built *(recent)* | The outermost ordered list renders as a numbered timeline — badge, connector line, body — so all of a task's steps can live in one `prompt_text`. Numbers come from a CSS counter, so nothing authored or in JS keeps count |
| **Per-block Copy button** | Built *(recent)* | Each fenced block gets its own Copy, which copies that block rather than the whole prompt — so a step whose instruction *is* a prompt puts just the prompt on the clipboard |
| **`{{token}}` substitution in step content** | Built *(recent)* | `{{user_name}}`, `{{participant_number}}`, `{{prefix}}`, `{{scope}}`, `{{app_name}}`, `{{instance_url}}`. One authored prompt serves every participant |

### Markdown rendering — constraints held

- No `rehype-raw` / raw HTML. `prompt_text` is author-editable, so raw HTML
  would be a stored-XSS vector. Raw HTML in content renders escaped.
- `javascript:` URLs are emptied by `defaultUrlTransform`; ServiceNow-relative
  URLs (`/sys_attachment.do?...`, `*.iix`) pass through untouched.
- Token substitution runs on the Markdown **source**, before rendering and
  before Copy reads it, so Copy still hands over Markdown — with the reader's
  own values rather than `{{prefix}}`. Unknown tokens are left as written so a
  typo shows on the page instead of vanishing.
- Images get a non-empty `alt` unless the Markdown explicitly sets `alt=""`.
- External links get `target="_blank"` + `rel="noopener noreferrer"`.
- Styling uses `--now-*` design tokens with `rgb(var(--token, r, g, b))`
  fallbacks; works light/dark and on mobile.

### Participant numbering — how a number is chosen

Every participant gets a number on enrolment, and the number is the whole basis
of the isolation scheme: it becomes the prefix (`p07`, `mm04`), the prefix
becomes the application name and the scope (`x_snc_p07`), and the scope is what
keeps one participant's Build Agent work out of everyone else's.

A facilitator reads these numbers out loud, so they have to stay small.
`LabApi._ensureParticipantNumber` runs on every enrolment check and writes only
when the row has no number yet, so a number never moves once assigned:

1. **A number already on the row wins.** Nothing re-allocates.
2. **A number in the user name is taken as-is, if it is free.**
   `now.assist.participant7` → `7`, from the trailing digits of
   `gs.getUserName()`. This is what lets a pre-named roster line up with itself:
   Participant #3's app really is `x_snc_p03`.
3. **Otherwise, the lowest number not already taken in this plan.** Read from
   the plan's own Plan Participant rows, counting up from 1. Lowest free rather
   than `max + 1`, so a plan whose roster churns keeps reusing small numbers
   instead of drifting upwards.

**Allocation is race-safe**, in three parts that only work together:

- a **unique index** on `(evaluation_plan, participant_number)`, so the database
  refuses a duplicate rather than accepting one;
- the number is set **on the insert**, not written afterwards, so there is no
  window in which a row exists without one;
- a refused insert is **retried** — the next pass re-reads what is taken, sees
  the winner's row and picks the next free number. Five attempts, which only a
  genuine collision consumes.

Two people opening a plan in the same instant therefore get two different
numbers. Verified against the live index: a second row with a number already
used in that plan is refused, the same number in a *different* plan is accepted,
and enrolling against a number taken a moment earlier still succeeds on another
number.

**The read that picks the number uses `GlideRecord`, not `GlideRecordSecure`** —
the one deliberate exception in the server layer. A participant may read only
their own Plan Participant row, so a secure read returns a single row and every
participant is told they are number 1. That is what the code did until it was
found: it looked right only because a facilitator, and the admin who tested it,
can read every row. The exception is narrow — one integer column, used to pick
a number, never returned to a caller.

The initials come from the display name, taking the first letter of each word
that *starts* with a letter, at most three — so `Marc Mouries` → `mm`, and
`Participant #1` → `p`, because `#1` contributes nothing. The number is
zero-padded to two digits. Worst case is 3 letters + 3 digits, which keeps
`x_snc_` + prefix inside the 18-character cap on `sys_scope.scope`.

**Why not a separate band for users whose name carries no number.** The first
build allocated those from 900 up (`mm900`), to keep them clear of the numbers
that are *implied* by a user name but not yet written to any row — an allocator
cannot see that `now.assist.participant1` is going to want `1`. That traded a
cosmetic problem for a worse one: the fourth person in a three-person workshop
was told they were participant 900. The collision it avoided is cosmetic because
the number is never unique on its own — it is always paired with initials, so
`mm02` and `p02` are still different people with different scopes — and a clash
shows up to the facilitator as two rows sharing a number rather than failing
silently. Small numbers are worth more than that guarantee.

---

## 3. Facilitator experience

| Feature | Status | Notes |
|---|---|---|
| Facilitator dashboard | Built | `/holg?id=facilitator` and `x_snc_holg_facilitator.do` |
| Summary tiles | Built | Participants, Completed, Avg. complete, Overall pass rate |
| Participant progress table | Built | User, status, percent, started/completed, **current task title**; sortable columns |
| Results by task chart | Built | not_started / in_progress / submitted / pass / fail per task |
| Pass rate by section chart | Built | Graded count and pass rate per section |
| Recent feedback | Built | 25 most recent submissions |
| Impersonate a participant | Built | Banner remembers the original user (scope cannot attribute impersonation) |
| Plan addressable by slug on the dashboard | Built *(recent)* | `?id=facilitator&plan_id=Now-Assist-for-Creator` now resolves; previously only a sys_id matched and anything else fell back to the first plan without saying so |
| Dashboard plan choice reflected in the URL | Built *(recent)* | Picking a plan pushes `plan_id=<slug>`; landing with no plan replaces it, so the view is linkable and survives a refresh |
| Plan links use the slug, not the sys_id | Built *(recent)* | Plans list and post-enrolment navigation emit `plan_id=Now-Assist-for-Creator` |
| Per-plan participant list | Built | `x_snc_holg_plan_participant` keyed on `(evaluation_plan, user)`; surfaced as the "Participant progress" table, now carrying number and prefix |
| **Per-participant app + scope tracking** | **Not built** | See section 8 |
| **Artifact evidence vs. lab guide** | **Not built** | See section 7 |

---

## 4. Plan authoring

Editing a plan used to mean five tables in the platform UI and keeping `order`
values straight by hand. `/holg?id=authoring` is the portal surface for it.

| Feature | Status | Notes |
|---|---|---|
| **Tree of the whole plan** | Built *(recent)* | Plan → sections → tasks, expanding a task to its prompts and criteria. Selecting a node opens it on the right |
| **Edit all five levels** | Built *(recent)* | Plan, Section, Task, Task Prompt, Success Criterion — create, edit, delete, reorder |
| **Live Markdown preview** | Built *(recent)* | `PromptMarkdown`, the participant's own renderer, mounted beside the textarea — step timeline, code blocks and Copy buttons included |
| **Reordering with up/down** | Built *(recent)* | Keyboard-reachable, works on touch, needs no drag library. Each move resequences the whole sibling list server-side |
| **Delete guard on participant progress** | Built *(recent)* | Deleting a plan, section or task cascades to Task Results. The first attempt answers 409 with the count; the client asks, then repeats with `?confirm=true` |
| **Per-field length counters** | Built *(recent)* | Mirrors the column lengths; the server refuses an over-long value with a message rather than truncating |
| **Plan addressable by slug** | Built *(recent)* | `?id=authoring&plan_id=Now-Assist-for-Creator`, as the other two views are |
| **The open node is in the URL** | Built *(recent)* | `&node_id=<sys_id>` names whatever is being edited, so a task, prompt or criterion can be linked and shared, and Back and Forward move between the nodes visited. One param rather than two: a sys_id identifies its level, so there is nothing to arrive contradicting itself. A `node_id` the plan does not hold is dropped |

### How the write path is built

- **Six routes, not thirty.** The five tables differ only in table name, parent
  reference and which fields may be written, so that difference lives in one
  `LAB_AUTHOR_TYPES` map and the routes are generic:
  `POST /authoring/{type}`, `PATCH|DELETE /authoring/{type}/{sys_id}`,
  `POST /authoring/{type}/{sys_id}/move`, plus two reads.
- **Field allowlist per level.** A request body can only reach the fields that
  level declares. `order` and the parent reference are not among them, so they
  change only through `move` and a create — a body cannot reparent a node.
- **Writes go through `GlideRecordSecure`**, so the ACLs stay the authority.
  The role check on the endpoint only keeps them off the dashboard audience.
- **A move resequences the whole sibling list** to 100, 200, 300 rather than
  swapping two values. Swapping looks cheaper but does nothing when two rows
  share an `order`, which hand-authored data does.
- **The preview is the participant renderer**, exported from `PromptBox` rather
  than reimplemented. A preview that can drift from the page it previews is
  worse than none, because it gets believed.
- **One URL write per click.** On the portal the write goes through an Angular
  digest, so reading the param straight back still returns the old value. The
  first version compared against that stale read, concluded the URL was behind
  and wrote it again — two digests and two visible re-renders for every click.
  A ref holding what was last asked for replaces the read-back.
- **The URL follows the selection, and the selection follows the URL**, but a
  node already open wins: reloading the tree after a save, move or add must not
  reopen whatever the URL happened to name. Only a fresh document load, or
  Back/Forward, lets the URL decide.
- **The portal grid's gutters are stripped** from the wrappers that contain the
  authoring shell — about 45px a side the two-column workspace would rather
  spend on content. The rules match by what the wrapper contains (`:has()`), not
  by the container's sys_id, so re-laying out the page in Designer cannot leave
  a stale selector behind.

---

## 5. Surfaces

| Surface | Endpoint | Hosts |
|---|---|---|
| Service Portal | `/holg` | `home` (role gate), `plans`, `plan`, `facilitator`, `authoring` |
| Participant UI Page | `x_snc_holg_participant.do` | Participant React app |
| Facilitator UI Page | `x_snc_holg_facilitator.do` | Facilitator React app |
| Authoring UI Page | `x_snc_holg_authoring.do` | Plan authoring React app |
| Incident Manager UI Page | `x_snc_holg_incident_manager.do` | Separate demo surface (`IncidentForm`, `IncidentList`); not part of the lab flow |

All three React apps are BYOUI bundles served from `/uxasset/externals/x_snc_holg/`.
The portal shell widgets inject the bundle and pass URL params through
`window.__X_SNC_HOLG__`; the `.do` pages fall back to `data-holg` / `data-page`
plus `URLSearchParams`.

**Cross-view URLs are built as an allowlist.** Switching between the
participant and facilitator views keeps only `id` and (one way) `plan_id`, and
drops everything else. The earlier blacklist version deleted `plan_id` and kept
the rest, so params added later rode along: ending an impersonation from a task
landed on `?id=facilitator&task=...&task_id=...`, aiming the new view at a task
from the identity that had just ended.

**Dual-surface URL writes.** On the portal AngularJS owns the URL, so the shell
widget publishes `context.setParams`, which writes through `$location` inside a
`$timeout` digest. A bare `history.pushState` would be reverted on the next
digest. The `.do` pages use the History API directly.

---

## 6. Security

| Feature | Status | Notes |
|---|---|---|
| Three roles: `facilitator`, `participant`, `author` | Built | Plus scope defaults `admin`, `user` |
| Authoring is a separate role | Built *(recent)* | `x_snc_holg.author` gates the authoring page and the `/authoring` routes, so watching a workshop and changing the plan it runs from are different grants |
| Plan content is writable by authors only | Built *(recent)* | Create, write and delete on the five plan tables list `x_snc_holg.author` alone. A facilitator reads every plan including drafts, but cannot change one — not through the portal and not through the platform UI |
| ~45 record ACLs enforcing ownership | Built | Participants see only their own results and answers |
| Published-only plan visibility | Built | Condition-based ACL on `status=published` |
| `GlideRecordSecure` throughout the REST layer | Built | ACLs, not the API, are the source of truth |
| Scripted ACL for criterion ownership | Built | Walks up to the parent Task Result and compares `user` |

---

## 7. Build and tooling

| Item | Notes |
|---|---|
| `npm run build` | `now-sdk build`. **Does not deploy.** |
| `npm run deploy` | `now-sdk install`. **Does not build** — ships whatever is in `dist/`. Always `npm run build && npm run deploy`. |
| `npm run transform` | Converts metadata XML into Fluent TypeScript |
| `npm run types` | Refreshes dependency types |
| `now.prebuild.mjs` | Rollup customisation. Resolves `vfile`'s Node `imports` subpaths (`#minpath`, `#minproc`, `#minurl`) to their browser shims — without this the bundle ships unresolved specifiers and the lab renders blank while the build still reports success. |
| **14 KB per-file CSS limit** | The SDK bundler inlines a stylesheet only up to ~14 KB *per file*; past that it emits a standalone `components/*.css` that nothing loads. This is why `PromptBox.css` is a separate file from `ParticipantLab.css`. |
| Bundle size | `participant.jsdbx` 237,938 B raw / ~57 KB gzip. Markdown rendering added ~177 KB raw (~43 KB gzip), a 4× increase — material for a portal widget. `facilitator.jsdbx` 58,770 B, unaffected. |

---

## 8. Open — workshop facilitation tracking

Wanted: facilitators can see, per participant, **which app they built**, **what
records they have created**, and **whether those match the lab guide**, so it is
obvious who is ahead and who is behind.

Today the dashboard answers "how far along are they?" only from self-reported
Task Results (`percent_complete`, `current_task_title`). It cannot tell whether
a participant actually built anything, or built the right thing.

Known constraints for the design:

- **Scope is capped at 18 characters** (`sys_scope.scope`), and the company code
  `snc` consumes 6 of them as `x_snc_`, leaving 12. Past that the platform
  truncates and appends random characters — see `x_snc_employeeh5nv`,
  `x_snc_new_hire_i_0`. Per-participant scopes must therefore be short tokens
  (`x_snc_p07`), not derived from full names.
- **A scoped app does not contain blast radius.** 7 of the 10 tasks configure
  the Incident table, the Service Catalog, Process Automation Designer or ATF.
  Those artifacts belong to the participant's app but execute instance-wide.
- The lab runs on **one shared instance** with dozens of participants.

---

## 9. Known gaps and debts

| Item | Notes |
|---|---|
| Existing prompts assume a single namespace | 5 edits needed for multi-participant use: section 400 prompt 1 creates a *second* scoped app; section 400 prompt 2 creates duplicate global roles; the section 100 catalog item name collides; the section 200 ATF test resolves that item **by name**; sections 500/600 artifact names collide. Not yet applied — awaiting content approval. |
| A late-joining named account may not get its matching number | `now.assist.participant5` only keeps `5` while `5` is free. If someone numberless took it first, the named account falls back to the lowest free number and its prefix stops matching its account name. |
| Prompt label field carries "Prompt" wording | Per-box labels come from the `label` field on each Task Prompt record, not from code. The code fallback is still `Prompt N`, used only when `label` is empty. |
| Setup steps are instructions, not prompts | The Copy button on the setup task copies Markdown instructions rather than something to paste into Now Assist. Harmless, slightly odd. |
| Deployed bundle not independently verifiable | The `.jsdbx` files are not in `sys_ux_theme_asset` and are not attachments; the backing table for `/uxasset/externals/x_snc_holg/` was not located. |
