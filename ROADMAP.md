# Roadmap

What is left, and what each open task is waiting on. Companion to two other
files: `DONE.md` is the record of what has shipped, and `FEATURES.md` describes
how the built behaviour actually works.

Last updated 2026-11-13.

## Task list

One line each. The detail is in the numbered sections below.

| ID | | Task | Waiting on | Detail |
|---|---|---|---|---|
| **W1** | 🔴 | Drop the ServiceNow jargon from prompt wording | Your call on 4.1 and 4.4; 4.2 and 4.3 are applied | [1.1](#11-prompt-wording--drop-the-servicenow-jargon), [4](#4--prompt-wording) |
| **W2** | 🔴 | Make the setup task one stepped document instead of five records | Your go — it deletes four records | [1.2](#12-setup-task-as-one-stepped-document) |
| **W3** | 🔴 | Artifact tracker: add a scheduled baseline, or leave it on demand? | On demand is built; a 5-minute job is small from here | [1.3](#13-artifact-tracker--when-does-the-scan-run) |
| **P1** | ⚫ | Have a real participant open a plan and check the number they get | You — one login, then I check the row | [3.1](#31-check-a-real-participants-number-p1) |
| **P2** | ⚫ | Create the remaining `now.assist.participantNN` accounts | You — stops at 3 today | [3](#3--workshop-prep--your-side) |
| **P3** | ⚫ | Give each account app-creation and test rights | You | [3](#3--workshop-prep--your-side) |
| **P4** | ⚫ | Turn on `sn_atf.enable` instance-wide | You | [3](#3--workshop-prep--your-side) |
| **P5** | ⚫ | Confirm Now Assist entitlement, skills and Build Agent access | You | [3](#3--workshop-prep--your-side) |
| **W7** | 🔴 | Stop the lab mailing real people, by fixing the prompts rather than the instance | Your call on three lines | [4.6](#46-w7--stop-the-lab-mailing-real-people) |
| **P7** | ⚫ | Stagger section 400, or run it facilitator-led | You — five chained Build Agent prompts | [3](#3--workshop-prep--your-side) |
| **B9** | 🟠 | Facilitator view of an event's registrations, with retry | B6 | [5.4](#54-the-build-b6b12) |
| **B13** | 🟠 | Email each registrant a link back to the lab | Nothing to build against; delivery depends on P6 | [5.4](#54-the-build-b6b12) |
| **B14** | 🟠 | Application menu links for Lab Events and Lab Registrations | Nothing | [5.4](#54-the-build-b6b12) |
| **B11** | 🟠 | Give an event its own plan, and enrol registrants into it | B6 | [5.4](#54-the-build-b6b12) |
| **N1** | 🔵 | Terminate an event early, by hand | Nothing — B12 does the work, this is the button | [5.5](#55-platform-roles-including-admin-w6-b12) |
| **D1–D9** | ⚪ | Nine known debts, none scheduled | Your word on whether any matters | [6](#6-debts-worth-clearing) |

IDs are stable: **W** needs your word, **B** is mine to build, **N** is a nice
to have, **P** is workshop prep on your side, **D** is a known debt. They do not renumber when something
ships — a finished task moves to `DONE.md` and its ID retires with it.

## Status key

| | Meaning |
|---|---|
| 🔴 | **Input needed from you** — I cannot proceed without a decision |
| 🟠 | **Ready** — decided and unblocked, not started |
| ⚫ | **Your side** — workshop prep, not application work |
| 🔵 | **Nice to have** — wanted, not needed; built when the needed work is done |
| ⚪ | **Debt** — known, deliberate, not scheduled |

Shipped work moved to `DONE.md`.

---

## 1. 🔴 Needs input from you

Nothing below moves until you answer.

### 1.1 Prompt wording — drop the ServiceNow jargon

> *"in the prompts we don't want servicenow technical jargon like 'Add UI
> policies:'"*

Proposals are in [section 4](#4--prompt-wording). The field types (4.2) and the artifact names (4.3)
are settled and applied; 4.1 and 4.4 still need your call. These change what
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

**Caveat found while verifying:** `sys_update_xml` is metadata only for
*platform* tables. Demo-data expectations ("30 Claim records") are not modelled.
Data rows of a scoped app's own tables do appear, with the table in the `table`
column, so that door is open if you want it.

**Built on demand** (see `DONE.md`), because on demand is required under all
three options: the scan runs when the dashboard opens and whenever the
facilitator asks, and it is deliberately not on the summary's 30-second timer —
the summary reads this app's tables, a scan reads `sys_update_xml` for the whole
room, and nothing in it changes second to second.

**Still open, and now the only part:** do you also want a scheduled baseline?

| Option | Trade-off |
|---|---|
| Leave it on demand | What is built. Always current, one visible pause per scan. |
| Add a 5-minute schedule | Dashboard instant and trendable, up to 5 minutes stale. A Scheduled Job writing the counts onto Plan Participant. |

If you want the schedule, it is small now — the scan is one method call.

---

## 2. 🟠 Ready to build

Decided, unblocked, not started. B1 to B5 all shipped — see `DONE.md`. What is
left here waits on a decision in section 5.

| Item | Notes |
|---|---|
| **Self-registration and events (B6–B12)** | Planned in [section 5](#5--self-registration-and-events--the-plan). W4, W5 and W6 decided. B6, B7, B8 and the system-context job have shipped and are confirmed working end to end; B9, B11 and B13 remain |

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
- **Email**: see W7. Silencing the instance is no longer the plan — B13 needs
  outbound mail to work — so the prompts get fixed instead.
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

4.2 and 4.3 are **done**. 4.1 and 4.4 are still proposals awaiting your call —
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

### 4.3 🟢 Artifact names inside prompts — decided and applied

Your call, 13 November 2026. Five applied, two rejected.

| Record | Was | Now |
|---|---|---|
| `3800764c…3aa` | `Write a before insert and update business rule called "…" on the Incident table.` | `Add a rule called "…" that runs whenever an incident is created or updated.` |
| `3800764c…3aa` | `abort the action and show the error message` | `block the save and show the message` |
| `f000764c…3ad` | `Write an onChange client script called "…" on the Incident table for the Category field.` | `Add a rule to the incident form called "…" that is executed when someone changes the Category.` |
| `3000764c…3b7`, `3800764c…3b3` | `Create an ATF test called "…"` | `Create an automated test called "…"` |
| `3000764c…3a2` | `Add a module for each table in the application menu.` | `Add a menu item for each table, so they appear in the navigator.` — your point about naming the table, kept |

**Rejected, and why:**

| Record | Proposal | Your call |
|---|---|---|
| `f000764c…3ad` | `make Subcategory mandatory` → `require a Subcategory` | Keep `make Subcategory mandatory`. It is what the form does and what the participant will see |
| `f000764c…3a1` | `Create a Claim table with fields:` → `Create a Claim record with these details:` | Keep. The task creates a **table**, not a row in one — the proposal changed the meaning, not the register |

Nothing in any prompt body now says `ATF test`, `onChange client script` or
`before insert and update`.

**Your question — how does the business rule work and stay testable for a room
of participants?** It already does, and the content says so:

> If Priority is 1 - Critical, **the Short description starts with
> `{{prefix}}`** and Assignment group is empty, block the save and show the
> message …

Each participant's rule only fires on incidents whose short description carries
their own prefix, so one person's rule cannot block another person's save. The
ATF test is written to match — it inserts `{{prefix}} missing group test` and
`{{prefix}} with group test` — and both prompts carry a NOTE explaining why
those strings are load-bearing rather than decorative.

The client script is the exception, and its NOTE says so: a client script runs
on the Incident form for everyone and cannot be narrowed the way a server-side
rule can. That is why the setup task tells participants to create it inactive,
switch it on only while testing, and switch it off afterwards.

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

### 4.6 W7 — stop the lab mailing real people

**Your idea, and it is the right one.** Pointing the instance at a mail sink was
P6; it cannot stay, because **B13 needs outbound mail to work** — the "here is
your link back" email would silently send nothing. The two tasks contradicted
each other. Fixing the content leaves mail working for the app and quiet for
everyone else.

**Almost all of it is one prompt.** `f400764c…3a2`, the flow task, is the only
place the lab deliberately emails anybody:

| Now | Suggested |
|---|---|
| `Send an email to the manager of the incident's Assignment group with the incident number and short description.` | `Send an email to the person who opened the incident, with the incident number and short description.` |
| `Create an Incident Task assigned to the same Assignment group with the short description "Complete post-incident review".` | `Create an Incident Task assigned to the person who opened the incident, with the short description "{{prefix}} Complete post-incident review".` |
| `If the Category is Network, also send an email to the members of the Network group.` | `If the Category is Network, also add a work note saying the network team would be notified.` |

What each change costs and keeps:

- **Row 1** keeps the Send Email action and a dynamic recipient, which is the
  thing being learned. It just resolves to the participant instead of a real
  manager — and the participant *wants* to see the mail arrive, so it is a
  better exercise, not a watered-down one.
- **Row 2** keeps the Create Record action. An Incident Task assigned to a real
  group lands in that group's queue for everyone, times however many
  participants; assigned to themselves, they can see their own. The prefix on
  the short description also makes it findable.
- **Row 3** is the only real loss: the second Send Email becomes a work note. The
  learning objective there is a **conditional branch**, which a work note
  exercises just as well, and it is the one action in the lab that mails people
  who are not in the room.

**What this leaves alone**, having checked every prompt:

- The business rule and its ATF test name the **Service Desk** group, but
  neither sends mail — the rule blocks a save, the test asserts on it. No change
  needed.
- The playbook prompt has a supervisor **approval**, but the task only generates
  and saves the playbook; nothing runs it.
- The Build Agent application is self-contained in the participant's own scope.

So three lines in one record, and the room stops mailing strangers while the
registration email keeps working.

---

## 5. 🔴 Self-registration and events — the plan

> *"a publicly visible invitation page with a form … a workflow would create
> their user profile and their password … the concept of event so that the
> registration page would say to register for the event such as 'Customer
> Workshop November 13th 2026'"*

### 5.1 What the old app actually did

`Lab_Management_registration_update_set.xml` (the `x_snc_lab_man` app, exported
October 2020) is worth reading before copying: **it never creates a user
account.** It hands out instances from a pool.

| Piece | What it is |
|---|---|
| `Get your Instance` widget | `public: true`, no roles. A form taking first name, last name, email |
| `x_snc_lab_man_student_instances` | A pre-provisioned pool of PDIs, each with a `password` column in plain text |
| `registerUser(email)` | Takes the first row with `reserved = false` and `state = Configured`, stamps the name and email on it, sets `reserved = true` |
| `checkAlreadyRegistered(email)` | One query: has this email already claimed a row? |
| `getUsersInstances(email)` | Returns the instance URL **and its password** to the browser for display |
| `labManagement` script include | Syncs the pool, including paired child instances |
| `instance_reservation` page | The portal page the widget sits on |

So the useful precedent is the shape — a public portal page whose **widget
server script** does the write, with no public REST endpoint anywhere. What it
does not give us is any of the hard part:

- **No user accounts.** It claims instances, it does not create people.
- **No events.** One global pool, no notion of which workshop.
- **No verification of any kind.** Type anyone's email and the page returns that
  instance's password. For an in-person lab with a shared pool that was
  tolerable; for creating login accounts it is not.
- Both `sp_page` records in the export carry `public: false`, so how the page
  was actually reached is not answerable from the file.

### 5.2 What keeps abuse out (W4 — decided)

**Registration is one step.** Someone fills the form and the account exists:
name, email, event code in, username and password out. No approval, no queue, no
facilitator action, nothing to wait for. That is what the old app did and what
the workshop needs.

**Decided, 13 November 2026, revised the same day: the code is optional and
events here will not use one.** The conditions are all on the event record, all
enforced in the form's own server script, and none needs a human awake:

| Condition | Why |
|---|---|
| `status = open` | An event in draft or closed accepts nobody |
| Inside `starts_on`–`ends_on` | Registration stops when the workshop is over |
| Under `capacity` | Bounds how many accounts one link can produce |
| The right `registration_code` | **Only when the event sets one.** Blank — the default, and what this workshop uses — means the form does not ask and does not check |

People register at any hour and are working a second later.

**What dropping the code costs, stated once.** The code was the only part of the
gate that was a secret. Without it, anyone who has the link — or finds it — can
register while the event is open, and once `granted_roles` includes `admin` that
means an admin account on this instance. What still bounds it: the event is open
only when somebody opened it, the window closes it, and the capacity caps the
number. What no longer bounds it: knowing anything. Treat the link as the
credential it now is, keep the window to the hours of the workshop, and set a
capacity that matches the room. Setting a code on a single event is one field if
a particular workshop needs it back.

What I had written here before — a facilitator approving registrations, and then
a provisioning mode on the event — was my own addition on top of your design,
and it is gone. The event being open *is* the approval, and it happens once,
when the facilitator creates the event.

**The residual risk, stated once:** anyone holding the code can create an admin
account on this instance while the event is open. The window, the cap and
closing the event are what bound it, and B12 takes the roles away afterwards.

### 5.3 What the registrant sees (W5 — decided)

**Decided, 13 November 2026: credentials on screen, once.** What the old app did,
and what makes a room work — they read the username and password off the page and
log in. Nothing depends on outbound mail, which P6 leaves unanswered.

**Decided: the user name comes from their first and last name**, e.g.
`marc.mouries`. Two consequences for the build:

- No trailing digits for the participant-number logic to read, so every number
  comes from lowest-free (section 2). That is already the fallback path and
  needs no change.
- Two people with the same name collide. A suffix (`marc.mouries2`) settles it —
  but only after the email says they really are two people. See the matching
  rules in 5.4, because suffixing first is how one person ends up with two
  accounts.

**Decided: an existing account is reused, and its password is never touched.**

This is not an edge case. A lab run on a **customer's own instance** is the
normal case for it: everyone already has an account, with a password that is
theirs and must stay that way. Registration there is not registration at all —
it is joining a workshop.

So the form has two behaviours, and **the session decides which**, not a
configuration someone can get wrong:

| Who is asking | What happens |
|---|---|
| Nobody — the caller is `guest` | Create the account from first name, last name and email; grant the event's roles; show the username and password once. Our demo instance, people with no login |
| A signed-in user | Create nothing. Grant the event's roles to **that** user, record the registration, enrol them in the event's plan, and say "you are in" — no password written, nothing shown. A customer instance |

Two things follow, and both are improvements on what was planned before:

- **The account-takeover hole closes rather than being mitigated.** Earlier this
  section reused an account found *by email* from a public form, which meant the
  form could reset any user's password and display it. Matching on the session
  instead of on a submitted email means a public caller can never reach an
  existing account at all. An email that already exists and no session is a
  refusal with "you already have an account here — sign in and join from the
  same link".
- **`granted_roles` earns its place on the event.** On our instance an event
  grants `admin` (5.5). On a customer's instance it should almost certainly
  grant `x_snc_holg.participant` and nothing else — their security team decides
  what else, not this app. One field per event, no code change, and an event
  that grants nothing but the lab role is the sane default for anywhere that is
  not ours.

A customer-instance event also needs no public page: the participants are
already logged in, so the page can sit behind authentication and ask for
nothing but the event code. `public: true` is per page, so that is a second
page rather than a compromise on the first — or the same page, since a signed-in
caller never reaches the account-creation branch.

### 5.4 The build (B6–B12)

**B6 — two tables.**

`x_snc_holg_event`: `name` ("Customer Workshop November 13th 2026"), `starts_on`,
`ends_on` (both optional — an event with no end date stays open until closed by
hand), `status` (draft / open / closed), `registration_code`, `capacity`,
`evaluation_plan` (which plan registrants are enrolled into), `facilitator`,
`granted_roles` (what provisioning grants — see 5.5), `roles_revoked_on`.
Registration is accepted only while `status = open` and the clock is inside the
window — two conditions, so forgetting to close it is not the only safeguard.

`x_snc_holg_registration`: `event`, `first_name`, `last_name`, `email`,
`status` (created / joined / awaiting_sign_in / failed / revoked), `user` (the
`sys_user` created or matched),
`created_on`, `failure_reason`. There is no `pending`: a registration either
produced an account or it failed, and a failure is something to retry, not
something to approve.
Unique index on `(event, email)` — the same lesson as participant numbers: let
the database refuse the duplicate rather than checking first and hoping.

ACLs: facilitators read, authors and facilitators write the event, **nobody
reads the registration table without a role**. The public widget writes through
its server script, which is not subject to the table's read ACLs.

**B7 — the public page.** An AngularJS widget, deliberately *not* the React
bundle: the server script does the write, so there is no public REST route and
no public write path beyond the one widget. The page names the event
("Register for Customer Workshop November 13th 2026") from the event record, so
one page serves every workshop via `?event=<code or slug>`.

**B8 — creating *or* joining.** For a `guest` caller: create the `sys_user` with
a user name from their first and last name, set the password with
`setDisplayValue` (5.6 — `setValue` silently produces an account that cannot log
in), grant `x_snc_holg.participant` plus the event's `granted_roles`, link the
row, stamp `created_on`. For a signed-in caller: skip all of that, grant the
roles to the session's own user, and write the registration. One endpoint, two
branches, and the branch is chosen by who is asking.

**Never a second account for someone who already has one.** The order of these
checks is the whole of it — getting it wrong is how `marc.mouries` acquires a
`marc.mouries2`:

1. **Is there a session?** A signed-in caller is matched to their own user and
   nothing is created, whatever they typed in the form.
2. **Match on email first**, lower-cased and trimmed, against `sys_user.email`.
   A match means this person already exists. Never create.
3. **Then match the derived user name.** A name collision with a *different*
   email is genuinely a different person, so suffix. A name collision with the
   *same* email was already caught at step 2.
4. **An inactive match is reactivated, not duplicated.** B12 deactivates accounts
   when an event closes, so someone returning for a second workshop will match an
   inactive account of their own. Reactivate it and grant the new event's roles —
   never a fresh account, and never a password change.

What a guest caller matching an existing account gets: no account creation, no
roles granted, no credentials — a message saying the account already exists and
to sign in and join from the same link. The registration row is kept as
`awaiting_sign_in` so the facilitator can see who is stuck in that state. Roles
are never granted to an account on the strength of an unverified email.

The unique index on `(event, email)` in B6 catches the other duplicate: the same
person registering twice for the same event. Runs as part of the registration, not after it — see 5.5 for the
one probe that decides whether the form does it directly or hands it to a system
context in the same breath.

*To verify on the instance before building this:* whether a scoped app can set
`user_password` at all, and whether `password_needs_reset` can be set with it.
The cross-scope privileges for `sys_user` create/write and `sys_user_has_role`
create are already declared in the repo, so the access is there; what the
scoped API will accept on a password field is not something to assume.

**B9 — the facilitator view.** Registrations for an event, with provisioning
state, and a way to retry one that failed. A monitor and a repair tool, not an
approval queue — nobody has to act for a registration to succeed.

**B13 — a link back, by email.** Registering is the one moment the lab is in
front of them; a week later it is a URL they no longer have. On a successful
registration, email them a link to the lab, so coming back and resuming is one
click from their inbox.

What the email carries:

- The lab link — `/holg`, which routes by role, plus the direct plan link so a
  returning participant lands on their own tasks rather than a list of one.
- The event's name and dates, because the link means nothing in six weeks
  without them.
- Their **user name**. Low risk, and without it a returning participant has a
  link they cannot get through.
- **Not the password.** It was shown once on screen (W5) and putting it in an
  inbox is a different decision from showing it on a page the person asked for.

Which leaves a real gap worth deciding when this is built: somebody who loses
the password cannot come back at all. The platform's own password-reset flow is
the answer, and the email is the natural place to point at it — but it has to
actually work for a lab account, which is its own check.

Delivery depends on **P6**: if the instance's mail is pointed at a sink, this
sends nothing and the registrant never knows. Worth sending to yourself first.

**B14 — menu links for the event tables.** Lab Event and Lab Registration have
no way in from the application navigator: an event is created and opened by
script today, which is fine for one workshop and wrong as a habit. Two modules
under the existing application menu — Lab Events, and Lab Registrations filtered
to the open events — make them ordinary records a facilitator can manage.

Small, and worth doing before B9 rather than after: a list view is most of what
a facilitator needs from the registration table, and it tells us what the purpose
built view in B9 actually has to add.

**B11 — the event's plan.** An event names one evaluation plan; provisioning
enrols the new user into it, so they land on their tasks rather than an empty
plan list.

### 5.5 Platform roles, including admin (W6, B12)

The lab tasks need more than a login. Building a scoped application, writing ATF
tests and running them needs `admin`, or a bundle that adds up to the same
freedom. This is the part that deserves thought, because a public page whose
end result is an admin account on this instance is a different proposition from
one that hands out a plan reader.

**What is verified on `marco1creator`:**

| Fact | Reading |
|---|---|
| `admin`: `grantable = true`, `elevated_privilege = false` | A context holding `user_admin` or `admin` can insert the grant. No security-admin elevation needed |
| 21 active business rules on `sys_user_has_role` | None blocks an admin insert. The "prevent" rules target specific roles: high assurance, SM, MID, read-only cloud |
| `delegated_developer`, `app_engine_admin`, `atf_test_designer`, `atf_test_admin` all exist | A least-privilege bundle is available instead of `admin` |
| 19 users already hold `admin` | For scale, not as an argument |

**Not verified, and worth one probe before B8 is built:** an actual grant from a
scheduled (system) context, and whether `user_password` can be set from a
scoped app at all.

**The one thing that has to be verified before B8 is written.** A public
widget's server script runs as `guest`. Plain `GlideRecord` does not consult
ACLs, which is how the old app wrote to its tables from a public page, so the
likely answer is that a guest-context script *can* insert a `sys_user` row and a
`sys_user_has_role` row. Likely is not verified, and I previously wrote the
opposite here as though it were settled. It was not tested, and this section
said so only after being challenged on it.

So the probe decides the shape:

| If a guest-context insert works | If it is refused |
|---|---|
| The form creates the account outright. One step, nothing asynchronous | The form writes the registration and a system-context trigger creates the account immediately — a business rule or a short-interval job, not a person. Still one step for the registrant, still no approval |

Either way the registrant's experience is the same and no human is in the loop.

**W6 — decided: `admin`.** Your call, 13 November 2026. Simplest, and what a PDI
gives everyone anyway.

`granted_roles` still lives on the **event** rather than in code, defaulting to
`admin`, so a future event can be narrowed to `delegated_developer` +
`app_engine_admin` + `atf_test_designer` + `atf_test_admin` without a deploy.

Two consequences follow, and together they are the whole safety story:

- **Not time-boxed.** Revocation was planned and is dropped (D8): an event that
  closes stops accepting registrations and leaves the accounts and their admin
  roles exactly as they are. Removing access is a manual job.

  The event still carries `starts_on` and `ends_on` (5.4), which bound who can
  *register*: past the end date the form refuses, so a leaked code stops
  working. What it does not bound is what was already granted.

  **Dropped on your call, 13 November 2026 (was B12).** Nothing revokes the
  roles; closing an event stops new registrations and leaves existing access in
  place. Recorded as D8. N1, terminating an event early, is therefore also just
  a way to stop new registrations rather than to cut off access.
- **The code carries more weight than it would otherwise.** When every event
  mints an admin, the code, the window and the cap are the only things standing
  between a leaked URL and an admin account — so an event's window should be the
  hours it is actually needed, not left open. 5.2 has the conditions.

**B12 — revoke on close.** When an event closes, remove the granted roles and
deactivate the accounts, on a schedule as well as on the status change, so a
forgotten event does not leave standing admins. Keep the `sys_user` rows long
enough to attribute the artifacts the tracker found, then purge with B10.

One more reason to time-box: this app's own gates now ask for a **granted** role
rather than trusting `gs.hasRole`, so a workshop admin is not automatically a
facilitator or an author here. That is deliberate, and it means an admin
participant can build their lab app without being able to edit the plan or read
the dashboard.

### 5.6 What the probes found (13 November 2026)

Run against `marco1creator` before writing any of it.

**Confirmed:**

| Check | Result |
|---|---|
| Cross-scope privileges the plan needs | All six declared and `allowed`: `sys_user` read/write/create, `sys_user_has_role` read/create, `sys_user_role` read |
| `sys_user.user_password` | Type `password`, `read_only = 0`, max length 100 — writable in principle by a script |
| Public portal pages work on this instance | 19 public `sp_page` and 122 public `sp_widget` records already exist |
| A public page really does serve anonymously | `/api/now/sp/page?id=landing` returns full containers and widgets with no session |
| The lab's own pages do **not** | `?id=home`, `?id=plans`, `?id=authoring` all return an empty page (565 bytes, `containers: []`) to an anonymous caller. The portal enforces it at the page API, not only in the browser |
| Fluent can declare both | `SPPage({ public: true })` and `Widget({ public: true })` are in the SDK API, so the public surface is declared in the repo rather than clicked on |
| `guest` | Exists, active, holds **zero** roles |

**Also confirmed, by creating a throwaway account and authenticating as it:**

| Check | Result |
|---|---|
| A scoped app can insert a `sys_user` row | Yes |
| A scoped app can grant `x_snc_holg.participant` | Yes |
| A scoped app can grant `admin` | Yes |
| The account can actually log in | Yes — `HTTP 200` on `/api/now/table/sys_user` and on the lab's own API, with a wrong password giving 401 as a control |
| Basic auth is on, MFA is off | `glide.basicauth.required.api = true`, `glide.authenticate.multifactor = false` |

The probe account and all 182 of its role grants were deleted afterwards, and
authenticating as it now returns 401.

**The finding that would have cost a workshop.** There are two ways to set a
password from a script, and only one of them works:

| | Stored value | Can the account log in? |
|---|---|---|
| `gr.setValue('user_password', pwd)` | 22 characters | **No — 401** |
| `gr.user_password.setDisplayValue(pwd)` | 92 characters | **Yes — 200** |

`setValue` stores something, the record looks right, nothing throws, and the
account cannot log in. That is the shape of a bug found at the worst moment: a
room of people, all of them locked out, nothing in the record to suggest why.
B8 uses `setDisplayValue`, and its test authenticates over REST rather than
checking that the column is non-empty.

`setNewPassword()` does not exist in either scope here, so it is not an option.
`setDisplayValue` works from the **scoped** app as well as from global —
verified separately, since the app runs scoped and that is the context that
matters.

**One more thing granting `admin` does:** the platform's "Expand Roles"
business rule materialises every role admin contains — 182 `sys_user_has_role`
rows for one grant. B12 should delete the `admin` grant and let the platform
retract the expansion, not try to manage 182 rows itself. Deleting the user
removed all of them cleanly.

**Still not testable without building B7:** whether the insert works from a
**guest** session. Everything above ran as an admin. That answer comes out of
the first public widget, not before it.



### 5.7 What this replaces

**P2** — "create the remaining `now.assist.participantNN` accounts" — mostly
goes away. Pre-made accounts stop being the mechanism; the event creates them.
Keep a handful for testing.

---

## 6. Debts worth clearing

| ID | Item | Notes |
|---|---|---|
| **D1** | Copy is no longer byte-identical to `prompt_text` | Token substitution runs on the Markdown source, so Copy hands over filled-in text. Deliberate — copying `{{prefix}}` would defeat the token — but it is a change to the original constraint |
| **D2** | Setup steps have no Copy button | Since Copy moved to code blocks and those five records are prose. Arguably correct: they are instructions to follow, not text to paste. Say if you want one back |
| **D3** | Deployed bundle cannot be verified independently | The `.jsdbx` files are not in `sys_ux_theme_asset` and are not attachments; the backing table for `/uxasset/externals/x_snc_holg/` was never located. Verification is by fetching the served URL and grepping it |
| **D4** | A named account can miss its matching number | See below |
| **D5** | Numbers are not reclaimed | Deleting a participant frees their number for the next enrolment, which is usually right, but it means a number is not permanently tied to a person |
| **D9** | The registration link is the only thing protecting account creation | With no code, whoever has the URL can register while the event is open. Deliberate, 13 November 2026 — see 5.2. The window and the capacity are what remain |
| **D8** | Roles granted by registration are permanent | An event grants `admin` and nothing takes it back when the event closes — the accounts and their roles persist until someone removes them by hand. Was B12, dropped on your call 13 November 2026. The manual routes: deactivate the users, or delete the `admin` grant and let the platform retract its 182 contained roles |
| **D7** | Registration data is not purged | Lab Registration holds real names and email addresses and nothing deletes them; a closed event keeps its rows. Was B10, dropped on your call 13 November 2026. Deleting an event cascades its registrations, which is the manual route |
| **D6** | `FacilitatorDashboard.css` is 13.4 KB of a 14 KB limit | Past that the SDK emits a standalone `components/*.css` that nothing loads, and the dashboard silently loses its styling. The next CSS addition there should split the file first |

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
