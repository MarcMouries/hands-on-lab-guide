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
| **The admin role no longer opens the lab** | Every gate the app owns asks whether a role was granted (`sys_user_has_role`) instead of trusting `gs.hasRole`, which answers true for an admin for every role. The REST endpoints, `getMe` and the portal landing page now agree, and a refusal says the admin role is not enough. 8/8 self-test, including the contrast: `gs.hasRole=true` beside `holdsAppRole=false` for the same role |
| **B1 — the artifact tracker** | A `Task Expectation` table (table, optional name fragment, minimum count) per task; evidence from `sys_update_xml` in one query for the whole room, keyed on the participant's user name so work done in Global scope still counts; `app_scope` and `app_name` on Plan Participant, with the application found at the expected scope; `GET /facilitator/plans/{plan_id}/artifacts`; and an **Artifacts** column on the dashboard, sortable, next to Progress. 11 expectations seeded for the ten existing tasks from the artifact names the prompts ask for. 13/13 server self-test |
| **B3 — a plan's facilitator is set from the authoring UI** | The plan level gained a `facilitator` picker, filled from a new `GET /authoring/facilitators` listing users who hold `x_snc_holg.facilitator`. The author role was added to the field's read and write ACLs, so assigning one is no longer an admin job. A body can name any sys_id, so the server checks the role again on save and refuses anything else; empty clears the field |
| **Artifact names in prompts (4.3)** | Five rewordings applied on your call: the business rule, client script and ATF prompts no longer name the artifact type, `abort the action` became `block the save`, and modules became "a menu item for each table". Two rejected and recorded with the reason — `make Subcategory mandatory` stays because it is what the form does, and `Create a Claim table` stays because the task creates a table, not a row in one |
| **Self-registration works end to end** | Confirmed live, 13 November 2026: a guest on the public page produced `jane.doe` with `password_needs_reset = 0`, the participant role in the request and `admin` from the scheduled job a minute later, a registration row reading `x_snc_holg.participant,admin`, and an enrolment at number **3** with prefix `jd03` and scope `x_snc_jd03` — lowest-free numbering and initials composing correctly with the registration path, which had never been exercised together |
| **Generated passwords satisfy the instance's password policy** | `quartz-47-harbor` failed exactly one rule — no uppercase — so it was accepted when set and then forced a change at first login. The shape is now `Quartz-47-Harbor`, where every part clears a specific rule: capitals for uppercase, the words for lowercase, the digits for numeric, the hyphens for special (`-` is whitelisted by both policies here), and ~16 characters for Medium's minimum of 12 as well as Default Strong's 8. A word appearing in the person's own name is dropped from the pool, for "no user data". 300 generated passwords checked against both policies, 0 violations |
| **Platform roles granted by a job running as system** | A registrant is a guest, and a guest cannot grant `admin`: the role belongs to Global, so the insert is a cross-scope write the platform refuses for anyone who is not an admin. Every earlier probe ran in an admin session, where that check is relaxed, which is why it stayed hidden until a real guest registered. A scheduled job in this scope with no `runAs` runs as the system user and finishes the job within a minute — idempotent, bounded to 100 rows, open events only, and silent when there is nothing to do |
| **A guest really can create an account** | The open question behind the whole design, answered by a live registration: `jane.doe@example.com` on the public page produced a `sys_user`, a working password, the `x_snc_holg.participant` role and an enrolment, with nobody signed in. No approval step or provisioning queue is needed |
| **Copy the credentials** | A button copies both, labelled, since a password alone is half of what they need and they get one chance to keep it. Async clipboard API with a textarea fallback, because some embedded browsers refuse it outright |
| **Registration page repainted from the roadmap deck** | Palette sampled pixel by pixel from `Now-Assist-for-Creator-Roadmap-2025.png`: page `#071a24`, panels `#0a2030`, and the quarter-header gradient `#35bab3` → `#62d84e` on the button and as the rule under the hero. Dark in both instance themes on purpose — this page is the product's face to someone who has never seen the instance. The gradient carries a near-black label, like the deck's own green pills: white is 1.9:1 on `#62d84e` and fails even as large text |
| **The date moved out of the event name** | The event is "Customer Workshop" with `starts_on` 13 November 2026, not "Customer Workshop November 13th 2026". The page shows the name as its title and `13 November 2026` beneath it, with month names spelled out in code rather than taken from the instance's date format. Links accept both `Customer-Workshop` and `Customer-Workshop-2026-11-13`, since a generic name repeats every year |
| **The registration page, designed** | Navy-to-deep-navy hero carrying the event name, aqua rule, one card, one column, one button. Brand palette from `brand.css` — literal hex for the brand, `--now-*` tokens for surfaces, so it follows a light or dark instance theme around fixed chrome. 46px inputs at 16px text (no iOS zoom), a visible focus ring rather than a hue change, and a phone breakpoint |
| **Service Portal Sass does not support `&__suffix`** | The first version used it and shipped 814 bytes of CSS with every nested rule silently dropped — build clean, deploy clean, page unstyled. Flattened to explicit selectors: 7,893 bytes and 47 rule blocks confirmed in the served `css` field. Recorded in `CLAUDE.md` |
| **B6 — Lab Event and Lab Registration tables** | Event carries the four conditions that gate registration (code, status, window, capacity) plus `granted_roles` and the plan to enrol into. Registration carries the person, the account and a status of `created` / `joined` / `awaiting_sign_in` / `failed` / `revoked`, with a unique index on `(event, email)`. Seven ACLs: only facilitators read registrations, since they hold names and email addresses |
| **B7 — the public registration page** | `/holg?id=register&event=<slug>`, the only part of the app reachable without signing in. An AngularJS widget rather than the React bundle, so the whole public write path is one server script and there is no public REST route. Confirmed rendering with no session: the widget's server script runs as guest, calls scoped `LabApi`, and returns the event |
| **Event slugs use the whole name** | `_slug` gained a word cap parameter. A plan slug stops at four words, which made "Customer Workshop November 13th 2026" and the 2027 workshop the same string — a link for one would have opened the other. Found by the first lookup returning null |
| **B4 — the claims task description** | The one task that never said which tool it uses now says the right one: "Use **Build Agent** to build a claims exception tracking application end to end: a data model, roles, automation, a dashboard and demo data, across five steps." Every task but the setup one now names its tool |
| **B5 — no step is labelled "Prompt" any more** | The five Build Agent steps are named for what they build (`Application and data model`, `Roles and access`, `Automation`, `Dashboard`, `Demo data`); the eight single-step tasks have no label at all, since the task title already says what to do. An unlabelled step among several falls back to "Step N", matching the heading, rather than "Prompt N" |
| **B2 — shorter URL parameters** | `plan_id` → `plan`, `task_id` → `task`, `node_id` → `node`. The old names are still read, so every link already shared keeps working; writes emit only the new name and drop the old one in the same call, so the first write upgrades the URL it found. The REST path parameters are untouched — they are an API contract, not a reader's URL |
| **Race-safe participant numbers** | Unique index on `(evaluation_plan, participant_number)`, the number set on the insert instead of written afterwards, and a refused insert retried against a fresh read. 10/10 against the live index |
| **Every participant was being told they are number 1** | Found while checking the above. The read that picks the next free number used `GlideRecordSecure`, and a participant may read only their own row — so the "taken" list was one row long for everyone but a facilitator or an admin. Now a plain `GlideRecord`, the one deliberate exception in the server layer |
| **Participant #2 backfilled** | Was `participant_number = 0` with no prefix since before numbering existed; now `2` / `p02` by the same rule the app uses |
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
