# Roadmap

What is left, and what each open task is waiting on. Companion to two other
files: `DONE.md` is the record of what has shipped, and `FEATURES.md` describes
how the built behaviour actually works.

Last updated 2026-11-13.

## Task list

One line each. The detail is in the numbered sections below.

| ID | | Task | Waiting on | Detail |
|---|---|---|---|---|
| **W1** | 🔴 | Drop the ServiceNow jargon from prompt wording | Your call on the 4.1, 4.3 and 4.4 proposals | [1.1](#11-prompt-wording--drop-the-servicenow-jargon), [4](#4--prompt-wording) |
| **W2** | 🔴 | Make the setup task one stepped document instead of five records | Your go — it deletes four records | [1.2](#12-setup-task-as-one-stepped-document) |
| **W3** | 🔴 | Artifact tracker: decide when the scan runs | On demand, every 5 minutes, or both | [1.3](#13-artifact-tracker--when-does-the-scan-run) |
| **B1** | 🟠 | Build the artifact tracker | Nothing but W3 | [2](#2--ready-to-build) |
| **B2** | 🟠 | Shorten the URL parameters: `plan_id` → `plan`, `task_id` → `task` | Nothing | [2.1](#21-url-parameter-names-b2) |
| **B3** | 🟠 | Let someone assign a plan's facilitator without admin | A decision between two approaches | [2](#2--ready-to-build) |
| **B4** | 🟠 | Reword the claims task description | Needs drafting, not substitution | [2](#2--ready-to-build) |
| **B5** | 🟠 | Replace the per-step labels that still read "Prompt" | A data edit, best bundled with W1 | [2](#2--ready-to-build) |
| **P1** | ⚫ | Have a real participant open a plan and check the number they get | You — one login, then I check the row | [3.1](#31-check-a-real-participants-number-p1) |
| **P2** | ⚫ | Create the remaining `now.assist.participantNN` accounts | You — stops at 3 today | [3](#3--workshop-prep--your-side) |
| **P3** | ⚫ | Give each account app-creation and test rights | You | [3](#3--workshop-prep--your-side) |
| **P4** | ⚫ | Turn on `sn_atf.enable` instance-wide | You | [3](#3--workshop-prep--your-side) |
| **P5** | ⚫ | Confirm Now Assist entitlement, skills and Build Agent access | You | [3](#3--workshop-prep--your-side) |
| **P6** | ⚫ | Point email at a sink, or leave notifications off | You — real mail reaches real managers otherwise | [3](#3--workshop-prep--your-side) |
| **P7** | ⚫ | Stagger section 400, or run it facilitator-led | You — five chained Build Agent prompts | [3](#3--workshop-prep--your-side) |
| **D1–D5** | ⚪ | Five known debts, none scheduled | Your word on whether any matters | [5](#5-debts-worth-clearing) |

IDs are stable: **W** needs your word, **B** is mine to build, **P** is workshop
prep on your side, **D** is a known debt. They do not renumber when something
ships — a finished task moves to `DONE.md` and its ID retires with it.

## Status key

| | Meaning |
|---|---|
| 🔴 | **Input needed from you** — I cannot proceed without a decision |
| 🟠 | **Ready** — decided and unblocked, not started |
| ⚫ | **Your side** — workshop prep, not application work |
| ⚪ | **Debt** — known, deliberate, not scheduled |

Shipped work moved to `DONE.md`.

---

## 1. 🔴 Needs input from you

Nothing below moves until you answer.

### 1.1 Prompt wording — drop the ServiceNow jargon

> *"in the prompts we don't want servicenow technical jargon like 'Add UI
> policies:'"*

Proposals are in [section 4](#4--prompt-wording). The field types (4.2) are
settled and applied; 4.1, 4.3 and 4.4 still need your call. These change what
participants read, so they go in only with your approval, the way the
`{{prefix}}` edits did.

The one judgment call in there: some technical nouns are what the lab is
teaching. A participant should finish knowing that Now Assist built them a
*business rule*. My recommendation is that the technical noun belongs in the
**step title and the task description**, while the prompt body reads like a
business request — which is also closer to how Now Assist is meant to be used.

### 1.2 Setup task as one stepped document

The setup task is five separate Task Prompt records, one per step. The step
renderer now makes a whole task one Markdown document, which is what that task
wants to be: five steps, one timeline, one record.

Needs your go because it **deletes four records**.

### 1.3 Artifact tracker — when does the scan run?

> *"track the name of the app for each participant and track the records they've
> been creating and see if they align with the lab guide so that as facilitators
> we can track who's ahead and who's behind"*

**Decided:** matching is per-task expectations — a Task Expectation table
(`table_name` + encoded query + minimum count per task), producing per-task
evidence (found / partial / missing).

**Decided:** the evidence comes from `sys_update_xml` (Customer Updates), not
from scanning each participant's scope. One indexed query instead of dozens of
cross-scope reads; it carries `application`, `table`, `type`, `target_name`,
`action`, `sys_created_by` and `sys_created_on`, it is chronological, and it
still attributes work a participant did in Global scope. Verified by sampling
the 197 `x_snc_holg_*` rows on this instance.

**Caveat found while verifying:** `sys_update_xml` is metadata only. Demo-data
expectations ("30 Claim records") need a direct count in the participant's
scope, so a few expectations will not be satisfiable from it.

**Still open:** when it runs.

| Option | Trade-off |
|---|---|
| On demand | Facilitator clicks Refresh. Always current, visible pause. |
| Scheduled every 5 min | Dashboard instant, trend over time, up to 5 min stale. |
| Both | Warm baseline plus per-participant refresh. Most useful live, most to build. |

---

## 2. 🟠 Ready to build

Decided, unblocked, not started.

| Item | Notes |
|---|---|
| **Artifact tracker** | Expectation and evidence tables, the `sys_update_xml` query, the REST endpoint, the dashboard column, `app_name` / `app_scope` on Plan Participant. Blocked only on 1.3 |
| **Authoring: the plan facilitator field** | Left out of the authoring UI on purpose — a field-level ACL restricts `facilitator` to the facilitator role, and an author need not have it. Now that facilitator no longer has record-level write on the plan table, assigning a facilitator is an **admin** job in the platform UI. Options if that chafes: add `x_snc_holg.author` to the field ACL, or give the authoring editor a facilitator picker and let the server set it |
| **URL parameter names** | `plan_id` → `plan`, `task_id` → `task`. Detail in 2.1 |
| **Claims task description** | `Build a claims exception tracking application with…` is the one task that never said "Use Now Assist to", so the rename skipped it. Needs new wording, not a substitution — I can draft it |
| **Per-step labels still read "Prompt"** | `Prompt`, `Prompt 1 – application and data model`. These come from the `label` field on each Task Prompt record, not from code. A data edit, bundled naturally with 1.1 |

### 2.1 URL parameter names (B2)

From:

```
/holg?id=plan&plan_id=Now-Assist-for-Creator&task_id=Generate-catalog-item-variables-UI-policies
```

to:

```
/holg?id=plan&plan=Now-Assist-for-Creator&task=Generate-catalog-item-variables-UI-policies
```

`_id` says nothing once the value is a slug rather than a sys_id — the shorter
names read better in a URL a facilitator pastes into chat.

What it touches: `navigate.ts` (8 references), `FacilitatorDashboard.tsx` (6),
`PlanView.tsx`, `AuthoringApp.tsx`, and the cross-view allowlist in
`crossViewUrl`, which names the params it is allowed to carry over.

Three things I would do unless you say otherwise:

- **Keep reading the old names.** Links you have already shared, and the ones
  in `DONE.md` and `FEATURES.md`, should keep working. Reads accept either,
  writes only ever emit the new ones, and a URL arriving with an old name is
  rewritten in place with `replaceState` — the same upgrade a `task_id` holding
  a sys_id already gets.
- **Rename `node_id` → `node`** in the authoring view too, for one rule rather
  than two.
- **Leave the REST paths alone.** `/plans/{plan_id}` and
  `/authoring/plans/{plan_id}` are path parameters in the API contract, not
  browser URL params; renaming them would break callers for no reader benefit.

---

## 3. ⚫ Workshop prep — your side

- **Lab accounts stop at `now.assist.participant3`.** Dozens of seats means
  creating the rest. Keep the `...participantNN` pattern: the trailing number is
  what the participant number is taken from.
- Each account needs rights to create an application and run tests (`admin` or
  delegated developer, plus `atf_test_designer` / `atf_test_admin`).
- `sn_atf.enable` must be true instance-wide.
- Now Assist for Creator entitlement and skills active; Build Agent access per
  user.
- **Email**: with dozens of flows sending notifications, point the instance at a
  mail sink or leave notifications off, or real mail reaches real assignment
  group managers.
- **Stagger section 400** (Build an application) or run it facilitator-led — five
  chained Build Agent prompts, by far the heaviest on the instance.

### 3.1 Check a real participant's number (P1)

The allocation fix cannot be fully tested from here: a background script cannot
take on a participant's identity, so the part that depends on *their* read
access has only been reasoned about from the ACL records, not watched.

One login settles it. Either sign in as `now.assist.participant3`, or use
**Impersonate** on the facilitator dashboard, then open:

```
/holg?id=plan&plan_id=Now-Assist-for-Creator
```

What to look for, in setup Step 1 on the page:

| Expected | What it would mean |
|---|---|
| "your participant number is **3**" | Correct. The name-derived number was free and the allocation read saw every row |
| A number that is **not** 1 and not already taken | Also correct — 3 was taken, so the lowest free number was used |
| "your participant number is **1**" while 1 belongs to someone else | The bug is back: the allocation read is seeing only the caller's own row |
| "not assigned yet" | The write was refused. Tell me and I will read the row |

Tell me which you see and I will check the Plan Participant row to confirm the
prefix and scope match what the page said.

---

## 4. 🔴 Prompt wording

4.2 is **done**. 4.1, 4.3 and 4.4 are still proposals awaiting your call —
nothing in them is applied.

The pattern throughout: the prompt body asks for an **outcome**, and the
ServiceNow noun moves to the step title or the task description where it
teaches instead of obstructs.

### 4.1 The one you named

`a800764c…377` — section 100, catalog item

| Now | Suggested |
|---|---|
| `Add UI policies:` | `Make the form react as it is filled in:` |
| `Show Agency code and make it mandatory only when Application is Agent Portal.` | `Only ask for Agency code when the application is Agent Portal, and require it then.` |
| `Show End date and make it mandatory only when Temporary access is checked.` | `Only ask for End date when the access is temporary, and require it then.` |

### 4.2 🟢 Field types — applied

Your call, applied to `a800764c…377` and `f000764c…3a1`.

| Was | Now |
|---|---|
| `(choice: Life, Disability, Dental, Accident and Health)` | `(one of: Life, Disability, Dental, Accident and Health)` |
| `(choice, values depend on Application)` | `(one of these, depending on the Application)` |
| `(single-line text)` | `(short text)` |
| `(multi-line text)` | `(long text)` |
| `(multi-line text, mandatory)` | `(long text, required)` |
| `(checkbox)` | `(yes or no)` |

**Kept as they were**, on your call: `(reference to user)` and
`(reference to user, defaults to the current user)` read well enough, and
`(currency)` is already plain English. I had proposed `(a person)` and
`(an amount of money)`; both rejected.

### 4.3 Artifact names inside prompts

| Record | Now | Suggested |
|---|---|---|
| `3800764c…3aa` | `Write a before insert and update business rule called "…" on the Incident table.` | `Add a rule called "…" that runs whenever an incident is created or updated.` |
| `3800764c…3aa` | `abort the action and show the error message` | `block the save and show the message` |
| `f000764c…3ad` | `Write an onChange client script called "…" on the Incident table for the Category field.` | `Add a rule to the incident form called "…" that runs when someone changes the Category.` |
| `f000764c…3ad` | `make Subcategory mandatory` | `require a Subcategory` |
| `3000764c…3b7`, `3800764c…3b3` | `Create an ATF test called "…"` | `Create an automated test called "…"` |
| `3000764c…3a2` | `Add a module for each table in the application menu.` | `Add a menu item for each one, so they appear in the navigator.` |
| `f000764c…3a1` | `Create a Claim table with fields:` | `Create a Claim record with these details:` |

### 4.4 Step titles in the setup task

| Now | Suggested |
|---|---|
| `Step 2 - Create your scoped application` | `Step 2 - Create your own application` |
| `Step 4 - Work inside your own scope` | `Step 4 - Keep your work inside your own application` |
| `AES` *(unexplained)* | `App Engine Studio (AES)` on first use |

### 4.5 Deliberately left alone

Not jargon — these are labels a participant sees on the screen, so changing
them would make the prompt harder to follow, not easier:

`flow`, `work note`, `Incident Task`, `Assignment group`, `Priority 1 -
Critical`, `dashboard`, `ServiceNow Studio`, and the role names in section 400.

---

## 5. Debts worth clearing

| ID | Item | Notes |
|---|---|---|
| **D1** | Copy is no longer byte-identical to `prompt_text` | Token substitution runs on the Markdown source, so Copy hands over filled-in text. Deliberate — copying `{{prefix}}` would defeat the token — but it is a change to the original constraint |
| **D2** | Setup steps have no Copy button | Since Copy moved to code blocks and those five records are prose. Arguably correct: they are instructions to follow, not text to paste. Say if you want one back |
| **D3** | Deployed bundle cannot be verified independently | The `.jsdbx` files are not in `sys_ux_theme_asset` and are not attachments; the backing table for `/uxasset/externals/x_snc_holg/` was never located. Verification is by fetching the served URL and grepping it |
| **D4** | A named account can miss its matching number | See below |
| **D5** | Numbers are not reclaimed | Deleting a participant frees their number for the next enrolment, which is usually right, but it means a number is not permanently tied to a person |

### D4 — a named account can miss its matching number

`now.assist.participant5` is meant to become participant **5**, prefix `p05`,
scope `x_snc_p05`: the trailing digits of the user name are used as the number,
which is what makes a pre-named roster line up with itself.

That only holds while 5 is still free. Numbers are handed out lowest-free as
people arrive, so if five other people enrol first they take 1 to 5, and
`participant5` arriving sixth gets **6** and prefix `p06`. Their account name
and their scope then disagree, which is confusing precisely for the roster the
name-matching was meant to serve.

It only bites when named accounts and other users are mixed in one plan, or
when the named accounts arrive out of order. Two ways out if it matters:

- **Reserve the named band.** Treat 1–N as belonging to `participantN` and hand
  unnamed arrivals numbers from N+1 up. Costs nothing but a constant.
- **Pre-enrol the roster** before the workshop, so every named account already
  holds its number when the day starts.
