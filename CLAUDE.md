# Working in this repo

Written for Claude, from what has actually bitten in this codebase. `README.md`
explains what the app is; this is how to change it without breaking it.

---

## Finish a task: build, deploy, test, commit, push

**Every task ends with a commit and a push.** Not at the end of the session,
not when a batch of work piles up — when the task is done and tested.

```bash
npm run build && npm run deploy          # never one without the other
# ... verify on the instance ...
git add -A && git commit -m "..." && git push
```

Nothing is "done" until it is deployed, verified and pushed. A task left
uncommitted is a task that will be redone.

**`npm run deploy` does not build.** It is `now-sdk install`, which ships
whatever is sitting in `dist/`. Deploying without building ships the previous
version and looks like a successful deploy. Always run the pair.

Every install prints a rollback URL. Keep it in the message to the user — it is
the only undo.

---

## Verify on the instance, not in your head

- **Served asset:** `curl -s -o /dev/null -w "%{http_code} %{size_download}" "https://marco1creator.service-now.com/uxasset/externals/x_snc_holg/participant.jsdbx?uxpcb=$(date +%s)"`
- **Records and server code:** write a script to the scratchpad and run
  `npx now-sdk exec --scope x_snc_holg --file <path>`. It runs with your own
  permissions, like Scripts - Background. The REST layer has been self-tested
  this way with mock `request`/`response` objects against a throwaway plan —
  repeat that for anything new on `LabApi` and clean up after yourself.
- **Querying from the CLI:** `now-sdk query` requires `--query`; a match-all is
  `fieldISNOTEMPTY^ORfieldISEMPTY`. CLI output has `[now-sdk]` log lines before
  the JSON, so slice from the first `[\n` before parsing.
- Claiming something works because the build passed is how the blank-page bug
  shipped. The build reports success with unresolved specifiers in the bundle.

---

## Things that are not yours to decide

- **Never grant a role.** `sys_user_has_role` inserts are the user's to make,
  and the permission layer will refuse them anyway. Give them the command.
- **Never bulk-rewrite `x_snc_holg_task_prompt` content.** Report which records
  need reformatting and let the user approve the wording. A single record the
  user has explicitly asked you to change is fine — verify the match count
  first, and say exactly what changed.
- **Never add `rehype-raw` or `rehype-dangerous-html`.** react-markdown drops
  raw HTML by default and `prompt_text` is author-editable data: enabling it is
  a stored-XSS vector. Keep it off.

---

## Server code

- Everything in the REST layer goes through `GlideRecordSecure`, so ACLs stay
  the authority and the role check on an endpoint is only a front door.
- `GlideAggregate` for counts; never `getRowCount()` on a large query.
- The real `LabApi` source is
  `src/fluent/generated/server-development/script-include/sys_script_include_060b9bd91e4642ea9e66146df4f20fb4.server.js`.
  Edit that file, not a copy.
- Scoped roles are auto-namespaced, so `x_snc_holg.author` cannot collide with
  another scope's `author`.
- **Never gate on `gs.hasRole` for an app role.** It returns true for an admin,
  for every role that exists, which makes the app behave differently for the
  people building it than for the people using it. Ask `holdsAppRole`, which
  looks for a real `sys_user_has_role` grant. Two bugs hid behind this.
- `gs.hasRole('admin')` is still right for things that genuinely need admin,
  such as impersonation.
- An `sp_page.roles` check is a different test again, and admins bypass it — an
  admin reaching a page proves nothing about whether it opens for anyone else.
- New cross-scope access makes the instance auto-create a
  `sys_scope_privilege` row that exists **only there**. Declare in
  `src/fluent/sys-scope-privilege/` what the app genuinely needs, and leave the
  rows your own maintenance scripts caused undeclared.

---

## Client code

- Three BYOUI React bundles — `participant`, `facilitator`, `authoring` — each
  served as a `.jsdbx` ES module and mounted by a Service Portal shell widget
  into `#react-root`.
- **Mount through `mountLabApp`** (`src/client/utils/mountRoot.ts`). It waits
  for the node instead of bailing. The widget is a digest away when the
  controller runs; injecting early is what made the page blank intermittently.
- **URL writes go through `setUrlParams`**, never `history.pushState` directly.
  On the portal AngularJS owns the URL: a bare pushState is reverted by the
  next digest, so the shell widget publishes `setParams`, which writes through
  `$location` inside a `$timeout`.
- **Do not read a param back to check a write landed.** The portal write is a
  digest away, so the read returns the old value. Keep what you asked for in a
  ref and compare against that. Reading it back is what made every click in the
  authoring UI write the URL twice.
- **`c.server.update()` takes no argument.** It sends `c.data` as the server
  script's `input` and replaces `c.data` with the response. An object passed to
  it is ignored, so `input.action` never arrives, the server falls through, and
  the button changes while nothing happens — no error anywhere. Put the values
  on `c.data` and call `update()` bare, or use `c.server.get(obj)`, which does
  take an object but leaves `c.data` alone.
- **A POST to a widget does not carry the page's query parameters.** Anything the
  server script read from `$sp.getParameter()` on the GET has to travel in the
  body too, or the submit rebuilds the page as if the URL were wrong.
- **A Fluent property takes a literal, not an expression.** `css: [...].join()`
  or `'a' + 'b'` either fails the build or, worse, writes the string
  `Symbol(CallExpressionShape)` into the field with a clean build and a clean
  deploy. Use `Now.include('./file.css')` or one literal.
- **A widget stylesheet cannot reach outside the widget.** The compiler prefixes
  every selector with that widget's instance class, so page chrome needs the
  page's own `css` (`SPPage({ css: Now.include(...) })`).
- **The Service Portal's Sass compiler does not support `&__suffix`.** A rule
  nested as `&__hero` inside `.holg-reg` compiles to *nothing*, silently: the
  build passes, the deploy passes, and the page ships with the parent rule only
  and no layout. Spell every selector out in a widget stylesheet. After a CSS
  change, read the `css` field back off `/api/now/sp/page` and check a selector
  you expect is actually in it.
- **A 14 KB per-file CSS limit** in the SDK bundler: past it a standalone
  `components/*.css` is emitted that nothing loads. This is why `PromptBox.css`
  is separate from `ParticipantLab.css`. After a CSS change, check the build
  output for an emitted `components/` file.
- The preview in the authoring editor mounts `PromptMarkdown`, the participant's
  own renderer. Keep it that way — a preview that can drift from the page it
  previews is worse than none, because it gets believed.
- `box-sizing: border-box` is scoped per view (`.holg-lab *`, `.holg-author *`),
  not global. A new view needs its own.

---

## Style

- **Design tokens:** `rgb(var(--now-color_text--primary, 16, 23, 26))` — always
  a `--now-*` token with a literal fallback, so the instance theme drives it
  and nothing goes invisible when a token is missing. Light and dark, phone
  and desktop, 4.5:1 text and 3:1 UI contrast.
- Update the Service Portal widget CSS in the same change as the React CSS.
- Images need non-empty `alt`; `alt=""` only when the Markdown explicitly says
  decorative.
- Report the bundle-size delta when a change moves it.
- Write code that reads like the code around it: same comment density, same
  naming, same idiom. Comments here explain *why*, usually by naming the thing
  that went wrong without them.

---

## The document set

| File | Holds |
|---|---|
| `README.md` | What the app is and how it is put together |
| `FEATURES.md` | How built behaviour actually works, kept current |
| `ROADMAP.md` | What is left: a task list up top, detail in numbered sections |
| `DONE.md` | What has shipped, newest first |

When a task finishes: move its line from `ROADMAP.md` into `DONE.md`, update
`FEATURES.md` if behaviour changed, then commit and push.
