# Architecture

How the parts fit together, and why they are arranged the way they are.
`FEATURES.md` lists what the application does; this explains the mechanics
behind the parts where the arrangement is not obvious from the code.

---

## Self-registration

A workshop guest arrives from an invitation link with no account on the
instance, fills in a form, and is working a minute later. Nobody approves
anything and nothing waits for a human.

### What runs where

```
           ┌──────────────────────────────────────────────────┐
browser    │  /holg?id=register&event=Customer-Workshop        │
           │  Service Portal page  ·  public: true            │
           └───────────────────────┬──────────────────────────┘
                                   │  AngularJS widget
                                   │  x_snc_holg_registration
                                   ▼
           ┌──────────────────────────────────────────────────┐
guest      │  widget server script                            │
session    │    · reads the event                             │
           │    · on submit, calls LabApi.register()          │
           └───────────────────────┬──────────────────────────┘
                                   ▼
           ┌──────────────────────────────────────────────────┐
           │  x_snc_holg.LabApi                               │
           │    · gates on the event record                   │
           │    · creates sys_user + password                 │
           │    · grants x_snc_holg.* roles                   │
           │    · writes x_snc_holg_registration               │
           │    · enrols in the plan                          │
           └───────────────────────┬──────────────────────────┘
                                   │  admin cannot be granted here
                                   ▼
           ┌──────────────────────────────────────────────────┐
system     │  scheduled job, every minute, no runAs           │
context    │  LabApi.grantPendingEventRoles()                 │
           │    · grants the event's platform roles           │
           └──────────────────────────────────────────────────┘
```

Three things about that shape are deliberate.

**The form is an AngularJS widget, not the React bundle.** Every other surface
in this app is React mounted into `#react-root`. This one is not, so that the
entire public write path is one server script. A React page would have needed a
Scripted REST endpoint with `requiresAuthentication: false`, which is a second
thing reachable without a session and a second thing to get right.

**The write happens in the widget's server script.** Nothing else about this app
is reachable without signing in; `sp_page.public` and `sp_widget.public` are
true for these two records and nothing else.

**The privileged half is a separate transaction** — see below. It is not an
approval step and nobody is waiting on it.

### The request, step by step

A visitor with no session:

```
1  GET the page
     event resolved from ?event= (slug, or slug + date, or sys_id)
     gates evaluated → accepting: true
     ?email= prefills the form, deriving Jane / Doe from the local part

2  POST the form  (c.server.update(), values carried on c.data)
     LabApi.register(eventId, form)
       ├─ re-check the gates          an event can close between GET and POST
       ├─ check the code              only if the event defines one
       └─ guest? → _registerNewAccount

3  _registerNewAccount
       ├─ match on email              already a user? stop, never create a second
       ├─ pick a free user name       first.last, suffixed only if a DIFFERENT
       │                              person holds it
       ├─ insert sys_user
       ├─ set the password            user_password.setDisplayValue(...)
       ├─ grant x_snc_holg.participant
       ├─ write x_snc_holg_registration
       └─ enrol in the event's plan

4  Response: user name + password, shown once, with a copy button

5  Within a minute, as system:
     grantPendingEventRoles() grants `admin`
     and updates the registration row
```

A visitor who is already signed in takes a different branch at step 2 —
`_joinAsCurrentUser` — which creates nothing and **never touches their
password**. Their own user is granted the event's roles and enrolled. This is
the normal case when the lab runs on a customer's own instance, where everyone
already has an account.

### The privilege boundary, which is the whole design

This is the constraint everything else is arranged around:

| Operation | As a guest | Why |
|---|---|---|
| Insert `sys_user` | **works** | Cross-scope privilege `sys_user create` is declared and allowed |
| Set `user_password` | **works** | Same, via `write` |
| Grant `x_snc_holg.participant` | **works** | The role belongs to this application — not a cross-scope write at all |
| Grant `admin` | **refused** | The role record belongs to Global, so the insert *is* a cross-scope write, and the platform refuses it for any caller who is not an admin |

The last row is the one that shaped the architecture, and it stayed hidden for a
long time because **every probe ran in an admin session, where the check is
relaxed**. The same grant, from this same scope, succeeds for an admin and fails
for a guest. What was missing was never the scope privilege — that is declared
and allowed — but the caller.

Worse than failing: the platform pushes a security message into the session, so
the registrant saw a refusal on the page having in fact been registered
successfully, with an account, a role and an enrolment.

So `_grantEventRoles` grants **only this app's own roles** inline and leaves the
rest alone, and a scheduled job finishes the work:

- **No `runAs`.** A Scheduled Script Execution with nobody named runs as the
  system user, which is the context where the refusal does not apply. Naming a
  person would tie the mechanism to one account staying active and keeping its
  roles.
- **Every minute**, which is the gap between reading a password off a screen and
  needing the access. Signing in takes longer.
- **Idempotent** — a settled room costs two queries and no writes.
- **Bounded to 100 rows** per run, so a misconfigured event cannot turn one run
  into a sweep of the table.
- **Open events only**, so a registration row outliving its workshop is not a
  route back to the roles that workshop handed out.

`src/global-scope/HolgEventRoles.js` is an alternative to the job, following the
Triangulator pattern: a Script Include whose own scope is Global, callable from
any scope, so the insert is not cross-scope. It is **not installed** — the job
removed the need for it. It is kept because it is the only way to grant those
roles *in the request* rather than a minute later.

### What gates a registration

Four conditions, all fields on the Lab Event record, all checked in the server
script, none of them needing a person to be awake:

| Condition | Effect |
|---|---|
| `status = open` | A draft or closed event accepts nobody |
| inside `starts_on` – `ends_on` | Registration stops when the workshop is over |
| under `capacity` | Bounds how many accounts one link can produce |
| `registration_code` | **Only when the event sets one.** Blank means the form does not ask and does not check |

They are re-evaluated on the POST and not taken from the page, because an event
can close between the page loading and the form being submitted.

With no code set, the link *is* the credential — the window and the capacity are
what remain. That is recorded as debt **D9** in `ROADMAP.md`.

### Identity: never two accounts for one person

The order of these checks is the whole of it. Getting it wrong is how
`marc.mouries` acquires a `marc.mouries2`:

1. **Is there a session?** A signed-in caller is matched to their own user and
   nothing is created, whatever the form says.
2. **Match on email first**, lower-cased and trimmed. A match means this person
   already exists, so nothing is created and **no role is granted** — an email
   nobody has verified is not proof of anything. They are sent to sign in and
   come back, and the row is kept as `awaiting_sign_in`.
3. **Then the derived user name.** A collision with a *different* email is
   genuinely a different person, so it is suffixed. A collision with the *same*
   email was already caught at step 2.
4. **An inactive match is reactivated, not duplicated** — someone returning for
   a second workshop matches an account of their own.

A unique index on `(event, email)` catches the other duplicate: the same person
registering twice for one event. Registration rows **upsert** on that pair, and
`granted_roles` accumulates across attempts, because registering again is a
normal way to collect roles an earlier attempt could not grant.

### Passwords

Generated as `Quartz-47-Harbor`, and every part of that shape clears a specific
rule of the instance's password policy:

| Part | Rule |
|---|---|
| Capitals | at least 1 uppercase |
| The words | at least 1 lowercase |
| The digits | at least 1 numeric |
| The hyphens | at least 1 special — `-` is whitelisted by the Medium policy and permitted by Default Strong |
| ~16 characters | Medium's minimum of 12, as well as Default Strong's 8 |

A word appearing in the person's own name is dropped from the pool, because both
policies set `disallow_user_data`.

Two traps live here, both found the hard way:

- **`setValue('user_password', ...)` produces an account that cannot log in.**
  It stores a value, throws nothing, and leaves the record looking correct.
  `user_password.setDisplayValue(...)` is the one that works. The test for this
  authenticates over REST rather than checking the column is non-empty.
- **A password that violates policy is accepted when set, then forces a change
  at first login.** The first generator was all lowercase, failing one rule —
  uppercase — and the symptom was `password_needs_reset = 1`, which no amount of
  clearing fixed, because the flag was never the cause.

### What degrades, and how

| If this fails | Then |
|---|---|
| The scheduled job never runs | Account, participant role and enrolment are all done; only the extra platform roles are missing |
| `global.HolgEventRoles` is absent | Nothing — the job covers it, and the call is wrapped |
| The account cannot be created | The registration is recorded as `failed` with a reason, and the page says so rather than appearing to succeed |
| The registration row cannot be written | Swallowed. The account exists by then, and losing the bookkeeping must not read as a failed registration |
| The email already exists | No account, no roles, `awaiting_sign_in`, and an instruction to sign in |

### Where it lives

| Piece | Path |
|---|---|
| Event and registration tables | `src/fluent/table/x_snc_holg_event.now.ts`, `…_registration.now.ts` |
| ACLs | `src/fluent/acl/x_snc_holg_event.*`, `x_snc_holg_registration.*` |
| Public page | `src/fluent/service-portal/page/Register.now.ts` (+ `register/page.css`) |
| Widget | `src/fluent/service-portal/widget/x_snc_holg_registration.now.ts` and its folder |
| Server logic | the registration block in the `LabApi` script include |
| Scheduled job | `src/fluent/scheduled-script/Finish_Registrations.now.ts` |
| Unused global bridge | `src/global-scope/HolgEventRoles.js` |
