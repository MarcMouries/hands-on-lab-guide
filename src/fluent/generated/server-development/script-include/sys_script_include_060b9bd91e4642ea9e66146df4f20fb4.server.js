/**
 * LabApi - shared logic behind the "Lab" Scripted REST API
 * (/api/x_snc_holg/lab).
 *
 * Every table read and write goes through GlideRecordSecure, so the
 * existing x_snc_holg ACLs decide what each caller may see and change.
 * This file creates no tables, fields, roles or ACLs.
 *
 * Script Include context: gs, GlideRecordSecure, GlideDateTime and JSON
 * are auto-available and must NOT be imported.
 */

// Tables
var LAB_T_PLAN = 'x_snc_holg_evaluation_plan'
var LAB_T_SECTION = 'x_snc_holg_plan_section'
var LAB_T_TASK = 'x_snc_holg_plan_task'
var LAB_T_PROMPT = 'x_snc_holg_task_prompt'
var LAB_T_CRITERION = 'x_snc_holg_success_criterion'
var LAB_T_PARTICIPANT = 'x_snc_holg_plan_participant'
var LAB_T_RESULT = 'x_snc_holg_task_result'
var LAB_T_CRITERION_RESPONSE = 'x_snc_holg_criterion_response'
var LAB_T_USER = 'sys_user'

// Roles
var LAB_ROLE_FACILITATOR = 'x_snc_holg.facilitator'
var LAB_ROLE_PARTICIPANT = 'x_snc_holg.participant'
var LAB_ROLE_AUTHOR = 'x_snc_holg.author'

// Stored choice values, exactly as defined on the tables
var LAB_PLAN_PUBLISHED = 'published'
var LAB_PARTICIPANT_IN_PROGRESS = 'in_progress'
var LAB_PARTICIPANT_COMPLETE = 'complete'
var LAB_RESULT_NOT_STARTED = 'not_started'
var LAB_RESULT_IN_PROGRESS = 'in_progress'
var LAB_RESULT_SUBMITTED = 'submitted'
var LAB_RESULT_PASS = 'pass'
var LAB_RESULT_FAIL = 'fail'
var LAB_ANSWER_YES = 'yes'
var LAB_ANSWER_NO = 'no'

/* The authoring tree, one entry per editable level.
 *
 * `fields` is the allowlist a request body may write - anything else in a body
 * is ignored, so `order` and the parent reference can only be changed through
 * the move endpoint and a create. `limits` mirrors the column lengths in
 * src/fluent/table, so an over-long value is refused with a message instead of
 * being silently truncated by the platform.
 *
 * A plan has no `order` column: plans are listed by name, so `ordered` is
 * false and the move endpoint refuses it. `facilitator` is deliberately absent
 * from the plan's fields - a field-level ACL restricts it to facilitators, and
 * an author may not be one.
 */
var LAB_AUTHOR_TYPES = {
    plan: {
        table: LAB_T_PLAN,
        parent: '',
        ordered: false,
        fields: ['name', 'description', 'status'],
        mandatory: ['name'],
        limits: { name: 120, description: 4000 },
    },
    section: {
        table: LAB_T_SECTION,
        parent: 'evaluation_plan',
        ordered: true,
        fields: ['title', 'overview'],
        mandatory: ['title'],
        limits: { title: 120, overview: 4000 },
    },
    task: {
        table: LAB_T_TASK,
        parent: 'plan_section',
        ordered: true,
        fields: ['title', 'description', 'scenario', 'how_to_test', 'dependency_note'],
        mandatory: ['title'],
        limits: {
            title: 120,
            description: 4000,
            scenario: 4000,
            how_to_test: 4000,
            dependency_note: 4000,
        },
    },
    prompt: {
        table: LAB_T_PROMPT,
        parent: 'plan_task',
        ordered: true,
        fields: ['label', 'prompt_text'],
        mandatory: [],
        limits: { label: 120, prompt_text: 8000 },
    },
    criterion: {
        table: LAB_T_CRITERION,
        parent: 'plan_task',
        ordered: true,
        fields: ['criterion'],
        mandatory: [],
        limits: { criterion: 4000 },
    },
}

var LAB_PLAN_STATUSES = ['draft', 'published', 'closed']

// Words dropped when building a plan slug, compared case-insensitively.
// 'for' is deliberately NOT a stop-word.
var LAB_SLUG_STOP_WORDS = ['a', 'the', 'with', 'and']
var LAB_SLUG_MAX_WORDS = 4

var LabApi = Class.create()

LabApi.prototype = {
    initialize: function () {},

    /* ------------------------------------------------------------ *
     * Helpers
     * ------------------------------------------------------------ */

    _send: function (response, status, body) {
        response.setContentType('application/json')
        response.setStatus(status)
        response.setBody(body)
    },

    _str: function (value) {
        return value === null || value === undefined ? '' : String(value)
    },

    _toInt: function (value) {
        var n = parseInt(this._str(value), 10)
        return isNaN(n) ? 0 : n
    },

    _now: function () {
        return new GlideDateTime().getValue() + ''
    },

    _pathParam: function (request, name) {
        var params = request.pathParams || {}
        return this._str(params[name])
    },

    /** Returns the parsed body, {} when empty, or null when unparseable. */
    _parseBody: function (request) {
        try {
            var raw = request.body ? this._str(request.body.dataString) : ''
            if (!raw) {
                return {}
            }
            return JSON.parse(raw)
        } catch (e) {
            return null
        }
    },

    /** Resolve sys_user sys_ids to display names in one query. */
    _userNames: function (ids) {
        var map = {}
        if (!ids || !ids.length) {
            return map
        }
        var gr = new GlideRecordSecure(LAB_T_USER)
        gr.addQuery('sys_id', 'IN', ids.join(','))
        gr.query()
        while (gr.next()) {
            map[gr.getUniqueValue() + ''] = this._str(gr.getValue('name'))
        }
        return map
    },

    /** Every Plan Task sys_id in a plan, walked through its sections. */
    _planTaskIds: function (planId) {
        var sectionIds = []
        var sg = new GlideRecordSecure(LAB_T_SECTION)
        sg.addQuery('evaluation_plan', planId)
        sg.query()
        while (sg.next()) {
            sectionIds.push(sg.getUniqueValue() + '')
        }
        if (!sectionIds.length) {
            return []
        }
        var taskIds = []
        var tg = new GlideRecordSecure(LAB_T_TASK)
        tg.addQuery('plan_section', 'IN', sectionIds.join(','))
        tg.query()
        while (tg.next()) {
            taskIds.push(tg.getUniqueValue() + '')
        }
        return taskIds
    },

    /*
     * Only ever called with the CALLER'S OWN participant record - getPlans,
     * startPlan and getPlan all resolve by user=gs.getUserID() - which is why
     * the display name can come from the session instead of a sys_user read.
     */
    _serializeParticipant: function (gr) {
        return {
            sys_id: gr.getUniqueValue() + '',
            evaluation_plan: this._str(gr.getValue('evaluation_plan')),
            user: this._str(gr.getValue('user')),
            user_display_name: gs.getUserDisplayName() + '',
            participant_number: this._toInt(gr.getValue('participant_number')),
            prefix: this._str(gr.getValue('prefix')),
            status: this._str(gr.getValue('status')),
            percent_complete: this._toInt(gr.getValue('percent_complete')),
            started_on: this._str(gr.getValue('started_on')) || null,
            completed_on: this._str(gr.getValue('completed_on')) || null,
        }
    },

    _serializeResult: function (gr) {
        return {
            sys_id: gr.getUniqueValue() + '',
            plan_participant: this._str(gr.getValue('plan_participant')),
            plan_task: this._str(gr.getValue('plan_task')),
            status: this._str(gr.getValue('status')),
            result: this._str(gr.getValue('result')) || null,
            feedback: this._str(gr.getValue('feedback')) || null,
            started_on: this._str(gr.getValue('started_on')) || null,
            submitted_on: this._str(gr.getValue('submitted_on')) || null,
        }
    },

    /** The current user's participant record for a plan, or null. */
    _findParticipant: function (planId) {
        var pp = new GlideRecordSecure(LAB_T_PARTICIPANT)
        pp.addQuery('evaluation_plan', planId)
        pp.addQuery('user', gs.getUserID())
        pp.setLimit(1)
        pp.query()
        return pp.next() ? pp : null
    },

    /**
     * Recalculate percent_complete and status for a participant from its
     * submitted Task Results. Returns the percentage, or null when the
     * participant record is not accessible.
     */
    _recompute: function (participantId) {
        if (!participantId) {
            return null
        }
        var pp = new GlideRecordSecure(LAB_T_PARTICIPANT)
        if (!pp.get(participantId)) {
            return null
        }
        var total = this._planTaskIds(this._str(pp.getValue('evaluation_plan'))).length

        var submitted = 0
        if (total > 0) {
            var rg = new GlideRecordSecure(LAB_T_RESULT)
            rg.addQuery('plan_participant', participantId)
            rg.addQuery('status', LAB_RESULT_SUBMITTED)
            rg.query()
            while (rg.next()) {
                submitted++
            }
        }

        var pct = total > 0 ? Math.round((submitted / total) * 100) : 0
        pp.setValue('percent_complete', pct)
        if (total > 0 && submitted >= total) {
            pp.setValue('status', LAB_PARTICIPANT_COMPLETE)
            if (!this._str(pp.getValue('completed_on'))) {
                pp.setValue('completed_on', this._now())
            }
        } else {
            pp.setValue('status', LAB_PARTICIPANT_IN_PROGRESS)
        }
        pp.update()
        return pct
    },

    /**
     * Human-readable, URL-safe slug for a plan name or task title.
     *
     * Algorithm, in order:
     *   1. every character outside A-Za-z0-9 becomes a space
     *   2. collapse whitespace runs, trim, split into words
     *   3. drop stop-words (case-insensitive): a, the, with, and
     *      ('for' is intentionally kept)
     *   4. if that removed everything, fall back to the unfiltered words
     *   5. keep the first 4 words and join with '-'
     *   6. original letter case is preserved
     *
     * 'Now Assist for Creator'  -> 'Now-Assist-for-Creator'
     * 'Generate a server-side ATF test' -> 'Generate-server-side-ATF'
     * Returns '' for null/empty input.
     */
    _slug: function (text) {
        var raw = this._str(text)
        if (!raw) {
            return ''
        }

        var pieces = raw.replace(/[^A-Za-z0-9]/g, ' ').split(' ')
        var i
        var words = []
        for (i = 0; i < pieces.length; i++) {
            if (pieces[i]) {
                words.push(pieces[i])
            }
        }
        if (!words.length) {
            return ''
        }

        var kept = []
        for (i = 0; i < words.length; i++) {
            var lower = words[i].toLowerCase()
            var isStop = false
            // Plain loop, not an object lookup: an object lookup would also
            // match inherited keys such as 'constructor' or 'toString'.
            for (var s = 0; s < LAB_SLUG_STOP_WORDS.length; s++) {
                if (lower === LAB_SLUG_STOP_WORDS[s]) {
                    isStop = true
                    break
                }
            }
            if (!isStop) {
                kept.push(words[i])
            }
        }

        var use = kept.length ? kept : words
        return use.slice(0, LAB_SLUG_MAX_WORDS).join('-')
    },

    /**
     * Resolve a {plan_id} path value that may be either a 32-character
     * sys_id or a slug produced by _slug(name).
     *
     * Returns a GlideRecordSecure positioned on the matching plan, or null
     * when nothing matches or the row is not readable by the caller.
     * Slug matching is case-insensitive and ordered by name, so a
     * collision always resolves to the same row.
     *
     * No status filter is applied here on purpose - callers decide.
     */
    _resolvePlan: function (planId) {
        var id = this._str(planId)
        if (!id) {
            return null
        }

        if (/^[0-9a-f]{32}$/i.test(id)) {
            var direct = new GlideRecordSecure(LAB_T_PLAN)
            if (direct.get(id)) {
                return direct
            }
        }

        var wanted = id.toLowerCase()
        var gr = new GlideRecordSecure(LAB_T_PLAN)
        gr.orderBy('name')
        gr.query()
        while (gr.next()) {
            if (this._slug(this._str(gr.getValue('name'))).toLowerCase() === wanted) {
                return gr
            }
        }
        return null
    },

    /**
     * Make sure the current user has a Plan Participant row for a plan.
     * Shared by POST /plans/{plan_id}/start and POST /tasks/{task_id}/result
     * so enrolment behaves identically in both.
     *
     * Returns null when the insert was refused (ACLs), otherwise
     * { sys_id, created, participant } where participant is a
     * GlideRecordSecure on the row, or null when the fresh row cannot be
     * re-read by the caller.
     */
    /* ------------------------------------------------------------ *
     * Participant number and prefix
     *
     * The number is what the workshop uses to keep dozens of participants
     * off each other's toes: it drives the prefix (p07), which drives the
     * application name and the 18-character scope (x_snc_p07).
     *
     * Numbers are handed out from one place and stay small, because a
     * facilitator reads them out loud: the lowest number not already taken in
     * this plan. A lab account whose user name carries a number
     * (now.assist.participant7 -> 7) keeps that number whenever it is still
     * free, so a pre-named roster lines up with itself.
     *
     * Both paths read the plan's rows and then write, so two people opening
     * the plan in the same instant can land on the same number. That is
     * cosmetic: the number only has to be unique alongside the initials it is
     * joined to, and the facilitator sees two rows rather than a silent
     * failure. Making it race-proof needs the unique index tracked in ROADMAP.md.
     * ------------------------------------------------------------ */

    /** The trailing digits of the caller's user name, or 0 if it has none. */
    _numberFromUserName: function () {
        var match = /(\d+)\s*$/.exec(gs.getUserName() + '')
        return match ? parseInt(match[1], 10) : 0
    },

    /** The numbers already handed out in a plan, as a lookup by number. */
    _takenNumbers: function (planId) {
        var taken = {}
        var pp = new GlideRecordSecure(LAB_T_PARTICIPANT)
        pp.addQuery('evaluation_plan', planId)
        pp.addQuery('participant_number', '>', 0)
        pp.query()
        while (pp.next()) {
            taken[this._toInt(pp.getValue('participant_number'))] = true
        }
        return taken
    },

    /**
     * The lowest number not in `taken`, counting from 1.
     *
     * Lowest free rather than max + 1 so that a plan whose roster has churned
     * keeps reusing small numbers instead of drifting upwards.
     */
    _lowestFreeNumber: function (taken) {
        var number = 1
        while (taken[number]) {
            number++
        }
        return number
    },

    /**
     * Initials from the caller's display name, lowercased, at most three.
     *
     * Only name words that actually START with a letter contribute, which is
     * what keeps the lab accounts sane: "Participant #1" yields 'p', because
     * '#1' has no leading letter to take. Falls back to 'p' for a name with no
     * usable letter at all, so a prefix is never empty.
     */
    _initialsFor: function () {
        var words = (gs.getUserDisplayName() + '').split(/[^A-Za-z0-9]+/)
        var letters = ''
        for (var i = 0; i < words.length && letters.length < 3; i++) {
            if (words[i] && /^[A-Za-z]/.test(words[i])) {
                letters += words[i].charAt(0).toLowerCase()
            }
        }
        return letters || 'p'
    },

    /**
     * Initials plus the number: p01, mm04, mm07. Zero-padded to two digits so
     * prefixes sort readably.
     *
     * The number is what makes this unique - two people with the same initials
     * get different numbers - and the initials are what make a scope
     * recognisable to its owner at a glance. Worst case this is 3 letters plus
     * 3 digits, so `x_snc_` + prefix stays inside the 18-character cap on
     * sys_scope.scope.
     */
    _prefixFor: function (number, initials) {
        return initials + (number < 10 ? '0' + number : '' + number)
    },

    /**
     * Give a participant their number and prefix if they do not have one.
     *
     * Safe to call on every enrolment check: it writes only when the number
     * is still missing, so a number never moves once assigned. A refused
     * write is swallowed, because the caller is a read that must succeed.
     */
    _ensureParticipantNumber: function (planId, gr) {
        if (!gr || this._toInt(gr.getValue('participant_number')) > 0) {
            return
        }
        var taken = this._takenNumbers(planId)
        var number = this._numberFromUserName()
        if (!number || taken[number]) {
            number = this._lowestFreeNumber(taken)
        }
        gr.setValue('participant_number', number)
        gr.setValue('prefix', this._prefixFor(number, this._initialsFor()))
        try {
            gr.update()
        } catch (e) {
            // Leaves the number at 0; the client shows it as unassigned.
        }
    },

    _ensureParticipant: function (planId) {
        var existing = this._findParticipant(planId)
        if (existing) {
            // Backfills participants enrolled before numbers existed.
            this._ensureParticipantNumber(planId, existing)
            return {
                sys_id: existing.getUniqueValue() + '',
                created: false,
                participant: existing,
            }
        }

        var pp = new GlideRecordSecure(LAB_T_PARTICIPANT)
        pp.initialize()
        pp.setValue('evaluation_plan', planId)
        pp.setValue('user', gs.getUserID())
        pp.setValue('status', LAB_PARTICIPANT_IN_PROGRESS)
        pp.setValue('started_on', this._now())
        pp.setValue('percent_complete', 0)
        var newId = pp.insert()

        if (!newId) {
            return null
        }

        var created = new GlideRecordSecure(LAB_T_PARTICIPANT)
        if (!created.get(newId + '')) {
            return { sys_id: newId + '', created: true, participant: null }
        }
        this._ensureParticipantNumber(planId, created)
        return {
            sys_id: newId + '',
            created: true,
            participant: created,
        }
    },

    /**
     * Bulk-materialise the current user's own Task Result rows for every
     * Plan Task in a plan, so a participant never lands on a task that has
     * no result row yet.
     *
     * Idempotent, and batched on purpose: one walk of the plan's tasks via
     * _planTaskIds, then ONE 'IN' query for the rows that already exist -
     * never one query per task. Only the tasks still missing a row are
     * inserted, as { plan_task, plan_participant, user, status }.
     *
     * Returns the number of rows inserted. Never throws and never reports
     * failure: a refused insert is swallowed, because the only caller is a
     * read that must still succeed.
     */
    _ensureResultsForPlan: function (planSysId, participantId) {
        if (!planSysId || !participantId) {
            return 0
        }

        var taskIds = this._planTaskIds(planSysId)
        if (!taskIds.length) {
            return 0
        }

        // One batched query for every result row the caller already owns
        var existing = {}
        var rg = new GlideRecordSecure(LAB_T_RESULT)
        rg.addQuery('plan_task', 'IN', taskIds.join(','))
        rg.addQuery('user', gs.getUserID())
        rg.query()
        while (rg.next()) {
            existing[this._str(rg.getValue('plan_task'))] = true
        }

        var inserted = 0
        for (var i = 0; i < taskIds.length; i++) {
            if (existing[taskIds[i]]) {
                continue
            }
            try {
                var ins = new GlideRecordSecure(LAB_T_RESULT)
                ins.initialize()
                ins.setValue('plan_task', taskIds[i])
                ins.setValue('plan_participant', participantId)
                ins.setValue('user', gs.getUserID())
                ins.setValue('status', LAB_RESULT_NOT_STARTED)
                if (ins.insert()) {
                    inserted++
                }
            } catch (e) {
                // A refused insert must never break the read that triggered it
            }
        }
        return inserted
    },

    /* ------------------------------------------------------------ *
     * GET /me
     * ------------------------------------------------------------ */

    getMe: function (request, response) {
        /*
         * Impersonation state comes from the session, not from a table.
         *
         * IMPORTANT scoped-API limitation, verified on this instance:
         * ScopedGlideSession exposes isImpersonating() but NOT
         * getImpersonatingUserID / getImpersonatingUserName /
         * getImpersonatingUserDisplayName - those live on the global
         * GlideSession only, and calling them from this scope throws
         * "Cannot find function ... in object ScopedGlideSession".
         * gs.getImpersonatingUserName() is fenced out of scope entirely, and
         * gs.getUser().getMyImpersonator() does not exist on ScopedUser.
         *
         * So the scope can report THAT the session is impersonating but not
         * WHO the original user is. The client remembers the original user
         * when it starts impersonation and uses that to end it.
         *
         * No role, ACL or record is created or changed here - this is a read.
         */
        var isImpersonating = false
        try {
            isImpersonating = gs.getSession().isImpersonating() === true
        } catch (e) {
            isImpersonating = false
        }

        this._send(response, 200, {
            sys_id: gs.getUserID() + '',
            name: gs.getUserDisplayName() + '',
            isFacilitator: gs.hasRole(LAB_ROLE_FACILITATOR),
            isParticipant: gs.hasRole(LAB_ROLE_PARTICIPANT),
            // Effective roles: while impersonating a non-admin this is false,
            // which is exactly why the Impersonate control disappears then.
            isAdmin: gs.hasRole('admin'),
            isImpersonating: isImpersonating,
        })
    },

    /* ------------------------------------------------------------ *
     * GET /plans
     * ------------------------------------------------------------ */

    getPlans: function (request, response) {
        var byPlan = {}
        var pp = new GlideRecordSecure(LAB_T_PARTICIPANT)
        pp.addQuery('user', gs.getUserID())
        pp.query()
        while (pp.next()) {
            byPlan[this._str(pp.getValue('evaluation_plan'))] = {
                sys_id: pp.getUniqueValue() + '',
                status: this._str(pp.getValue('status')),
                percent_complete: this._toInt(pp.getValue('percent_complete')),
            }
        }

        var plans = []
        var gr = new GlideRecordSecure(LAB_T_PLAN)
        gr.addQuery('status', LAB_PLAN_PUBLISHED)
        gr.orderBy('name')
        gr.query()
        while (gr.next()) {
            var planId = gr.getUniqueValue() + ''
            var planName = this._str(gr.getValue('name'))
            plans.push({
                sys_id: planId,
                // Stable, readable alias accepted by GET /plans/{plan_id}
                slug: this._slug(planName),
                name: planName,
                description: this._str(gr.getValue('description')),
                status: this._str(gr.getValue('status')),
                // null when the current user has not started this plan
                participant: byPlan[planId] || null,
            })
        }

        this._send(response, 200, { plans: plans })
    },

    /* ------------------------------------------------------------ *
     * POST /plans/{plan_id}/start
     * ------------------------------------------------------------ */

    startPlan: function (request, response) {
        var planId = this._pathParam(request, 'plan_id')
        if (!planId) {
            this._send(response, 400, { error: 'plan_id is required' })
            return
        }

        // Accepts a sys_id or a name slug
        var plan = this._resolvePlan(planId)
        if (!plan) {
            this._send(response, 404, { error: 'Evaluation Plan not found or not accessible' })
            return
        }
        var planSysId = plan.getUniqueValue() + ''

        var enrolment = this._ensureParticipant(planSysId)
        if (!enrolment) {
            this._send(response, 403, { error: 'Not permitted to start this Evaluation Plan' })
            return
        }

        if (!enrolment.created) {
            this._send(response, 200, {
                created: false,
                participant: this._serializeParticipant(enrolment.participant),
            })
            return
        }

        if (!enrolment.participant) {
            this._send(response, 201, { created: true, participant: { sys_id: enrolment.sys_id } })
            return
        }
        this._send(response, 201, {
            created: true,
            participant: this._serializeParticipant(enrolment.participant),
        })
    },

    /* ------------------------------------------------------------ *
     * GET /plans/{plan_id}
     * ------------------------------------------------------------ */

    getPlan: function (request, response) {
        var planId = this._pathParam(request, 'plan_id')
        if (!planId) {
            this._send(response, 400, { error: 'plan_id is required' })
            return
        }

        // Accepts a sys_id or a name slug
        var plan = this._resolvePlan(planId)
        if (!plan) {
            this._send(response, 404, { error: 'Evaluation Plan not found or not accessible' })
            return
        }
        // Everything below must query on the real sys_id, never the slug
        var planSysId = plan.getUniqueValue() + ''

        /*
         * Auto-create the caller's own Task Result rows BEFORE anything is
         * serialised, so freshly created rows show up in this very first
         * response. This is the explicitly requested behaviour: "tasks
         * should be auto created when participants open a plan".
         *
         * Yes, that means GET /plans/{plan_id} writes records. It is kept
         * deliberately narrow: participants only, the caller's own rows
         * only, and fully idempotent. Enrolment reuses the same
         * _ensureParticipant helper startPlan and ensureResult use, so
         * enrolment behaviour cannot drift between them.
         *
         * Any refusal (enrolment or insert) is swallowed and the plan is
         * still returned - a read must never 500 because a write was
         * refused. POST /tasks/{task_id}/result stays the per-task fallback.
         */
        if (gs.hasRole(LAB_ROLE_PARTICIPANT)) {
            try {
                var enrolment = this._ensureParticipant(planSysId)
                if (enrolment) {
                    this._ensureResultsForPlan(planSysId, enrolment.sys_id)
                }
            } catch (e) {
                // Intentionally ignored - the plan read continues regardless
            }
        }

        // Sections, ordered by order
        var sections = []
        var sectionById = {}
        var sectionIds = []
        var sg = new GlideRecordSecure(LAB_T_SECTION)
        sg.addQuery('evaluation_plan', planSysId)
        sg.orderBy('order')
        sg.query()
        while (sg.next()) {
            var sectionId = sg.getUniqueValue() + ''
            var section = {
                sys_id: sectionId,
                title: this._str(sg.getValue('title')),
                order: this._toInt(sg.getValue('order')),
                overview: this._str(sg.getValue('overview')),
                tasks: [],
            }
            sectionIds.push(sectionId)
            sectionById[sectionId] = section
            sections.push(section)
        }

        // Tasks, ordered by order, bucketed into their section
        var taskById = {}
        var taskIds = []
        if (sectionIds.length) {
            var tg = new GlideRecordSecure(LAB_T_TASK)
            tg.addQuery('plan_section', 'IN', sectionIds.join(','))
            tg.orderBy('order')
            tg.query()
            while (tg.next()) {
                var taskId = tg.getUniqueValue() + ''
                var taskTitle = this._str(tg.getValue('title'))
                var task = {
                    sys_id: taskId,
                    // Readable alias for the task title; sys_id is unchanged
                    slug: this._slug(taskTitle),
                    title: taskTitle,
                    order: this._toInt(tg.getValue('order')),
                    description: this._str(tg.getValue('description')),
                    scenario: this._str(tg.getValue('scenario')),
                    how_to_test: this._str(tg.getValue('how_to_test')),
                    dependency_note: this._str(tg.getValue('dependency_note')),
                    prompts: [],
                    success_criteria: [],
                    result: null,
                }
                taskIds.push(taskId)
                taskById[taskId] = task
                var parentSection = sectionById[this._str(tg.getValue('plan_section'))]
                if (parentSection) {
                    parentSection.tasks.push(task)
                }
            }
        }

        if (taskIds.length) {
            var taskIdList = taskIds.join(',')

            // Prompts, ordered by order
            var pg = new GlideRecordSecure(LAB_T_PROMPT)
            pg.addQuery('plan_task', 'IN', taskIdList)
            pg.orderBy('order')
            pg.query()
            while (pg.next()) {
                var promptOwner = taskById[this._str(pg.getValue('plan_task'))]
                if (promptOwner) {
                    promptOwner.prompts.push({
                        sys_id: pg.getUniqueValue() + '',
                        order: this._toInt(pg.getValue('order')),
                        label: this._str(pg.getValue('label')),
                        prompt_text: this._str(pg.getValue('prompt_text')),
                    })
                }
            }

            // Success criteria, ordered by order
            var criterionIds = []
            var criterionEntryById = {}
            var cg = new GlideRecordSecure(LAB_T_CRITERION)
            cg.addQuery('plan_task', 'IN', taskIdList)
            cg.orderBy('order')
            cg.query()
            while (cg.next()) {
                var critOwner = taskById[this._str(cg.getValue('plan_task'))]
                if (critOwner) {
                    var criterionId = cg.getUniqueValue() + ''
                    var criterionEntry = {
                        sys_id: criterionId,
                        order: this._toInt(cg.getValue('order')),
                        criterion: this._str(cg.getValue('criterion')),
                        // The caller's own Yes/No answer, filled in below
                        answer: null,
                    }
                    criterionIds.push(criterionId)
                    criterionEntryById[criterionId] = criterionEntry
                    critOwner.success_criteria.push(criterionEntry)
                }
            }

            // The current user's own Task Results
            var resultIds = []
            var rg = new GlideRecordSecure(LAB_T_RESULT)
            rg.addQuery('plan_task', 'IN', taskIdList)
            rg.addQuery('user', gs.getUserID())
            rg.query()
            while (rg.next()) {
                resultIds.push(rg.getUniqueValue() + '')
                var resultOwner = taskById[this._str(rg.getValue('plan_task'))]
                if (resultOwner) {
                    resultOwner.result = {
                        sys_id: rg.getUniqueValue() + '',
                        status: this._str(rg.getValue('status')),
                        result: this._str(rg.getValue('result')) || null,
                        feedback: this._str(rg.getValue('feedback')) || null,
                        submitted_on: this._str(rg.getValue('submitted_on')) || null,
                    }
                }
            }

            // One batched query for every criterion answer the caller owns.
            // Scoped to the caller's own result sys_ids, so no other
            // participant's answers can be returned here.
            if (criterionIds.length && resultIds.length) {
                var ag = new GlideRecordSecure(LAB_T_CRITERION_RESPONSE)
                ag.addQuery('success_criterion', 'IN', criterionIds.join(','))
                ag.addQuery('task_result', 'IN', resultIds.join(','))
                ag.query()
                while (ag.next()) {
                    var answered = criterionEntryById[this._str(ag.getValue('success_criterion'))]
                    if (answered) {
                        answered.answer = this._str(ag.getValue('answer')) || null
                    }
                }
            }
        }

        var participant = this._findParticipant(planSysId)
        var planName = this._str(plan.getValue('name'))

        this._send(response, 200, {
            sys_id: planSysId,
            // Readable alias accepted by this same endpoint
            slug: this._slug(planName),
            name: planName,
            description: this._str(plan.getValue('description')),
            status: this._str(plan.getValue('status')),
            percent_complete: participant
                ? this._toInt(participant.getValue('percent_complete'))
                : null,
            participant: participant ? this._serializeParticipant(participant) : null,
            sections: sections,
        })
    },

    /* ------------------------------------------------------------ *
     * PATCH /results/{result_id}
     * ------------------------------------------------------------ */

    patchResult: function (request, response) {
        var resultId = this._pathParam(request, 'result_id')
        if (!resultId) {
            this._send(response, 400, { error: 'result_id is required' })
            return
        }

        var body = this._parseBody(request)
        if (body === null) {
            this._send(response, 400, { error: 'Request body must be valid JSON' })
            return
        }

        var status = this._str(body.status)
        if (status !== LAB_RESULT_IN_PROGRESS && status !== LAB_RESULT_SUBMITTED) {
            this._send(response, 400, {
                error:
                    "status must be '" +
                    LAB_RESULT_IN_PROGRESS +
                    "' or '" +
                    LAB_RESULT_SUBMITTED +
                    "'",
            })
            return
        }

        var gr = new GlideRecordSecure(LAB_T_RESULT)
        if (!gr.get(resultId)) {
            this._send(response, 404, { error: 'Task Result not found or not accessible' })
            return
        }

        // A submitted result is final
        if (this._str(gr.getValue('status')) === LAB_RESULT_SUBMITTED) {
            this._send(response, 409, {
                error: 'This Task Result has already been submitted and can no longer be updated',
            })
            return
        }

        if (status === LAB_RESULT_SUBMITTED) {
            var outcome = this._str(body.result)
            if (outcome !== LAB_RESULT_PASS && outcome !== LAB_RESULT_FAIL) {
                this._send(response, 400, {
                    error:
                        "result must be '" +
                        LAB_RESULT_PASS +
                        "' or '" +
                        LAB_RESULT_FAIL +
                        "' when submitting",
                })
                return
            }
            gr.setValue('status', LAB_RESULT_SUBMITTED)
            gr.setValue('result', outcome)
            if (body.feedback !== undefined && body.feedback !== null) {
                gr.setValue('feedback', this._str(body.feedback))
            }
            if (!this._str(gr.getValue('started_on'))) {
                gr.setValue('started_on', this._now())
            }
            gr.setValue('submitted_on', this._now())
        } else {
            gr.setValue('status', LAB_RESULT_IN_PROGRESS)
            if (!this._str(gr.getValue('started_on'))) {
                gr.setValue('started_on', this._now())
            }
        }

        if (!gr.update()) {
            this._send(response, 403, { error: 'Not permitted to update this Task Result' })
            return
        }

        var pct = this._recompute(this._str(gr.getValue('plan_participant')))

        this._send(response, 200, {
            result: this._serializeResult(gr),
            percent_complete: pct,
        })
    },

    /* ------------------------------------------------------------ *
     * GET /facilitator/plans/{plan_id}/summary
     * ------------------------------------------------------------ */

    getFacilitatorSummary: function (request, response) {
        if (!gs.hasRole(LAB_ROLE_FACILITATOR)) {
            this._send(response, 403, { error: 'Requires the ' + LAB_ROLE_FACILITATOR + ' role' })
            return
        }

        var planId = this._pathParam(request, 'plan_id')
        if (!planId) {
            this._send(response, 400, { error: 'plan_id is required' })
            return
        }

        // Accepts a sys_id or a name slug
        var plan = this._resolvePlan(planId)
        if (!plan) {
            this._send(response, 404, { error: 'Evaluation Plan not found or not accessible' })
            return
        }
        // Everything below must query on the real sys_id, never the slug
        var planSysId = plan.getUniqueValue() + ''

        var i = 0

        // Sections
        var sectionOrder = []
        var sectionInfo = {}
        var sg = new GlideRecordSecure(LAB_T_SECTION)
        sg.addQuery('evaluation_plan', planSysId)
        sg.orderBy('order')
        sg.query()
        while (sg.next()) {
            var sectionId = sg.getUniqueValue() + ''
            sectionOrder.push(sectionId)
            sectionInfo[sectionId] = {
                sys_id: sectionId,
                title: this._str(sg.getValue('title')),
                order: this._toInt(sg.getValue('order')),
                pass: 0,
                fail: 0,
            }
        }

        // Tasks
        var taskOrder = []
        var taskInfo = {}
        if (sectionOrder.length) {
            var tg = new GlideRecordSecure(LAB_T_TASK)
            tg.addQuery('plan_section', 'IN', sectionOrder.join(','))
            tg.orderBy('order')
            tg.query()
            while (tg.next()) {
                var taskId = tg.getUniqueValue() + ''
                taskOrder.push(taskId)
                taskInfo[taskId] = {
                    sys_id: taskId,
                    title: this._str(tg.getValue('title')),
                    order: this._toInt(tg.getValue('order')),
                    section: this._str(tg.getValue('plan_section')),
                    not_started: 0,
                    in_progress: 0,
                    submitted: 0,
                    pass: 0,
                    fail: 0,
                }
            }
        }

        var taskIdList = taskOrder.join(',')

        // One pass over every Task Result for this plan
        var inProgressByParticipant = {}
        if (taskOrder.length) {
            var rg = new GlideRecordSecure(LAB_T_RESULT)
            rg.addQuery('plan_task', 'IN', taskIdList)
            rg.query()
            while (rg.next()) {
                var task = taskInfo[this._str(rg.getValue('plan_task'))]
                var rStatus = this._str(rg.getValue('status'))
                var rResult = this._str(rg.getValue('result'))
                if (task) {
                    if (rStatus === LAB_RESULT_SUBMITTED) {
                        task.submitted++
                    } else if (rStatus === LAB_RESULT_IN_PROGRESS) {
                        task.in_progress++
                    } else {
                        task.not_started++
                    }
                    if (rResult === LAB_RESULT_PASS) {
                        task.pass++
                    } else if (rResult === LAB_RESULT_FAIL) {
                        task.fail++
                    }
                    var owningSection = sectionInfo[task.section]
                    if (owningSection) {
                        if (rResult === LAB_RESULT_PASS) {
                            owningSection.pass++
                        } else if (rResult === LAB_RESULT_FAIL) {
                            owningSection.fail++
                        }
                    }
                }
                if (rStatus === LAB_RESULT_IN_PROGRESS) {
                    inProgressByParticipant[this._str(rg.getValue('plan_participant'))] = task
                        ? task.title
                        : ''
                }
            }
        }

        // Participants
        var participantRows = []
        var participantUserIds = []
        var pg = new GlideRecordSecure(LAB_T_PARTICIPANT)
        pg.addQuery('evaluation_plan', planSysId)
        pg.orderBy('user')
        pg.query()
        while (pg.next()) {
            var participantId = pg.getUniqueValue() + ''
            var pUserId = this._str(pg.getValue('user'))
            participantUserIds.push(pUserId)
            participantRows.push({
                sys_id: participantId,
                user: pUserId,
                user_name: '',
                status: this._str(pg.getValue('status')),
                percent_complete: this._toInt(pg.getValue('percent_complete')),
                started_on: this._str(pg.getValue('started_on')) || null,
                completed_on: this._str(pg.getValue('completed_on')) || null,
                current_task_title: inProgressByParticipant[participantId] || null,
            })
        }

        // 25 most recent submitted results
        var recent = []
        var recentUserIds = []
        if (taskOrder.length) {
            var sr = new GlideRecordSecure(LAB_T_RESULT)
            sr.addQuery('plan_task', 'IN', taskIdList)
            sr.addQuery('status', LAB_RESULT_SUBMITTED)
            sr.orderByDesc('submitted_on')
            sr.setLimit(25)
            sr.query()
            while (sr.next()) {
                var rUserId = this._str(sr.getValue('user'))
                var recentTask = taskInfo[this._str(sr.getValue('plan_task'))]
                recentUserIds.push(rUserId)
                recent.push({
                    sys_id: sr.getUniqueValue() + '',
                    submitted_on: this._str(sr.getValue('submitted_on')) || null,
                    user: rUserId,
                    user_name: '',
                    task_title: recentTask ? recentTask.title : null,
                    result: this._str(sr.getValue('result')) || null,
                    feedback: this._str(sr.getValue('feedback')) || null,
                })
            }
        }

        // Resolve display names once
        var names = this._userNames(participantUserIds.concat(recentUserIds))
        for (i = 0; i < participantRows.length; i++) {
            participantRows[i].user_name =
                names[participantRows[i].user] || participantRows[i].user
        }
        for (i = 0; i < recent.length; i++) {
            recent[i].user_name = names[recent[i].user] || recent[i].user
        }

        // Task Result counts by task and by result
        var resultsByTask = []
        for (i = 0; i < taskOrder.length; i++) {
            var t = taskInfo[taskOrder[i]]
            var ts = sectionInfo[t.section]
            resultsByTask.push({
                task: t.sys_id,
                task_title: t.title,
                section: t.section,
                section_title: ts ? ts.title : null,
                by_status: {
                    not_started: t.not_started,
                    in_progress: t.in_progress,
                    submitted: t.submitted,
                },
                by_result: {
                    pass: t.pass,
                    fail: t.fail,
                },
            })
        }

        // Pass rate per section, over graded (pass or fail) results only
        var passRateBySection = []
        for (i = 0; i < sectionOrder.length; i++) {
            var s = sectionInfo[sectionOrder[i]]
            var graded = s.pass + s.fail
            passRateBySection.push({
                section: s.sys_id,
                section_title: s.title,
                pass: s.pass,
                fail: s.fail,
                graded: graded,
                pass_rate: graded > 0 ? Math.round((s.pass / graded) * 100) : null,
            })
        }

        this._send(response, 200, {
            plan: {
                sys_id: planSysId,
                name: this._str(plan.getValue('name')),
                status: this._str(plan.getValue('status')),
            },
            participants: participantRows,
            results_by_task: resultsByTask,
            pass_rate_by_section: passRateBySection,
            recent_submitted: recent,
        })
    },

    /* ------------------------------------------------------------ *
     * POST /tasks/{task_id}/result
     *
     * Idempotent: materialises the caller's Task Result row for a task.
     * Repeat calls return the same row with created:false and never
     * insert a second one. The response body is flat.
     * ------------------------------------------------------------ */

    ensureResult: function (request, response) {
        var taskId = this._pathParam(request, 'task_id')
        if (!taskId) {
            this._send(response, 400, { error: 'task_id is required' })
            return
        }

        var task = new GlideRecordSecure(LAB_T_TASK)
        if (!task.get(taskId)) {
            this._send(response, 404, { error: 'Plan Task not found or not accessible' })
            return
        }
        var taskSysId = task.getUniqueValue() + ''

        // Walk task -> plan_section -> evaluation_plan
        var section = new GlideRecordSecure(LAB_T_SECTION)
        if (!section.get(this._str(task.getValue('plan_section')))) {
            this._send(response, 404, { error: 'Plan Task not found or not accessible' })
            return
        }
        var planSysId = this._str(section.getValue('evaluation_plan'))
        if (!planSysId) {
            this._send(response, 404, { error: 'Plan Task not found or not accessible' })
            return
        }

        // Same enrolment logic POST /plans/{plan_id}/start uses
        var enrolment = this._ensureParticipant(planSysId)
        if (!enrolment) {
            this._send(response, 403, { error: 'Not permitted to start this Evaluation Plan' })
            return
        }

        // Existing row wins - deterministic on duplicates
        var rg = new GlideRecordSecure(LAB_T_RESULT)
        rg.addQuery('plan_task', taskSysId)
        rg.addQuery('user', gs.getUserID())
        rg.orderBy('sys_created_on')
        rg.setLimit(1)
        rg.query()
        if (rg.next()) {
            var found = this._serializeResult(rg)
            found.created = false
            this._send(response, 200, found)
            return
        }

        var ins = new GlideRecordSecure(LAB_T_RESULT)
        ins.initialize()
        ins.setValue('plan_task', taskSysId)
        ins.setValue('plan_participant', enrolment.sys_id)
        ins.setValue('user', gs.getUserID())
        ins.setValue('status', LAB_RESULT_NOT_STARTED)
        var newId = ins.insert()

        if (!newId) {
            this._send(response, 403, {
                error: 'Not permitted to create a Task Result for this Plan Task',
            })
            return
        }

        var fresh = new GlideRecordSecure(LAB_T_RESULT)
        if (!fresh.get(newId + '')) {
            // Inserted but not readable back - report what we know
            this._send(response, 201, {
                sys_id: newId + '',
                plan_participant: enrolment.sys_id,
                plan_task: taskSysId,
                status: LAB_RESULT_NOT_STARTED,
                result: null,
                feedback: null,
                started_on: null,
                submitted_on: null,
                created: true,
            })
            return
        }

        var created = this._serializeResult(fresh)
        created.created = true
        this._send(response, 201, created)
    },

    /* ------------------------------------------------------------ *
     * PUT /results/{result_id}/criteria/{criterion_id}
     *
     * Upsert of the caller's Yes/No answer for one success criterion.
     * Does not touch the Task Result status, result or feedback - the
     * overall pass/fail verdict stays a PATCH /results/{result_id}
     * decision and is never derived from these answers.
     * ------------------------------------------------------------ */

    putCriterionAnswer: function (request, response) {
        var resultId = this._pathParam(request, 'result_id')
        if (!resultId) {
            this._send(response, 400, { error: 'result_id is required' })
            return
        }

        var criterionId = this._pathParam(request, 'criterion_id')
        if (!criterionId) {
            this._send(response, 400, { error: 'criterion_id is required' })
            return
        }

        var body = this._parseBody(request)
        if (body === null) {
            this._send(response, 400, { error: 'Request body must be valid JSON' })
            return
        }

        var answer = this._str(body.answer)
        if (answer !== LAB_ANSWER_YES && answer !== LAB_ANSWER_NO) {
            this._send(response, 400, {
                error: "answer must be '" + LAB_ANSWER_YES + "' or '" + LAB_ANSWER_NO + "'",
            })
            return
        }

        var result = new GlideRecordSecure(LAB_T_RESULT)
        if (!result.get(resultId)) {
            this._send(response, 404, { error: 'Task Result not found or not accessible' })
            return
        }

        if (this._str(result.getValue('user')) !== gs.getUserID() + '') {
            this._send(response, 403, {
                error: 'Not permitted to answer success criteria on this Task Result',
            })
            return
        }

        /*
         * Intentionally NOT gated on status === submitted.
         *
         * The Evaluation checklist is the participant's record of which
         * criteria were met, and it stays editable after the overall verdict
         * is submitted - lab participants routinely revisit a finished task.
         * The verdict itself is still final: patchResult keeps returning 409
         * for a submitted result, so result/feedback cannot change.
         */

        var criterion = new GlideRecordSecure(LAB_T_CRITERION)
        if (!criterion.get(criterionId)) {
            this._send(response, 404, { error: 'Success Criterion not found or not accessible' })
            return
        }

        if (this._str(criterion.getValue('plan_task')) !== this._str(result.getValue('plan_task'))) {
            this._send(response, 400, {
                error: 'Success Criterion does not belong to the Plan Task of this Task Result',
            })
            return
        }

        var resultSysId = result.getUniqueValue() + ''
        var criterionSysId = criterion.getUniqueValue() + ''

        // Upsert on (task_result, success_criterion)
        var cr = new GlideRecordSecure(LAB_T_CRITERION_RESPONSE)
        cr.addQuery('task_result', resultSysId)
        cr.addQuery('success_criterion', criterionSysId)
        cr.orderBy('sys_created_on')
        cr.setLimit(1)
        cr.query()

        if (cr.next()) {
            cr.setValue('answer', answer)
            if (!cr.update()) {
                this._send(response, 403, { error: 'Not permitted to update this answer' })
                return
            }
            this._send(response, 200, {
                sys_id: cr.getUniqueValue() + '',
                success_criterion: criterionSysId,
                task_result: resultSysId,
                answer: answer,
            })
            return
        }

        var ins = new GlideRecordSecure(LAB_T_CRITERION_RESPONSE)
        ins.initialize()
        ins.setValue('task_result', resultSysId)
        ins.setValue('success_criterion', criterionSysId)
        ins.setValue('answer', answer)
        var newId = ins.insert()

        if (!newId) {
            this._send(response, 403, { error: 'Not permitted to record this answer' })
            return
        }

        this._send(response, 200, {
            sys_id: newId + '',
            success_criterion: criterionSysId,
            task_result: resultSysId,
            answer: answer,
        })
    },

    /* ------------------------------------------------------------ *
     * Authoring
     *
     * Backs the portal authoring UI (?id=authoring). Every write goes
     * through GlideRecordSecure, so the x_snc_holg ACLs still decide what
     * lands - the role check here only keeps the endpoints off the dashboard
     * audience, who can watch a workshop but should not be able to edit the
     * plan it is running from.
     *
     * One generic node endpoint per verb rather than five sets of CRUD
     * routes: the five authoring tables differ only in their table name,
     * their parent reference and which fields may be written, so that
     * difference lives in LAB_AUTHOR_TYPES and the routes stay flat.
     * ------------------------------------------------------------ */

    /** The type config for a node type, or null when the type is unknown. */
    _authorType: function (type) {
        return Object.prototype.hasOwnProperty.call(LAB_AUTHOR_TYPES, type)
            ? LAB_AUTHOR_TYPES[type]
            : null
    },

    /** 403s unless the caller may author. Returns true when they may. */
    _authorGate: function (response) {
        if (gs.hasRole(LAB_ROLE_AUTHOR)) {
            return true
        }
        this._send(response, 403, {
            error: 'Requires the ' + LAB_ROLE_AUTHOR + ' role',
        })
        return false
    },

    /**
     * Reads the writable fields out of a request body.
     *
     * Returns { values } or { error }. Only fields named in the type config
     * are read, so a body cannot reach `order`, a parent reference or any
     * other column - those move through their own endpoints.
     */
    _authorValues: function (cfg, body, requireMandatory) {
        var values = {}
        var i
        for (i = 0; i < cfg.fields.length; i++) {
            var field = cfg.fields[i]
            if (!Object.prototype.hasOwnProperty.call(body, field)) {
                continue
            }
            var value = this._str(body[field])
            var limit = cfg.limits[field] || 0
            if (limit && value.length > limit) {
                return {
                    error: field + ' is longer than ' + limit + ' characters',
                }
            }
            if (field === 'status' && value && LAB_PLAN_STATUSES.indexOf(value) < 0) {
                return { error: 'status must be one of ' + LAB_PLAN_STATUSES.join(', ') }
            }
            values[field] = value
        }

        if (requireMandatory) {
            for (i = 0; i < cfg.mandatory.length; i++) {
                var name = cfg.mandatory[i]
                if (!this._str(values[name])) {
                    return { error: name + ' is required' }
                }
            }
        }

        return { values: values }
    },

    /** Sibling sys_ids under one parent, in the order they render. */
    _authorSiblings: function (cfg, parentId) {
        var ids = []
        var gr = new GlideRecordSecure(cfg.table)
        if (cfg.parent) {
            gr.addQuery(cfg.parent, parentId)
        }
        gr.orderBy('order')
        gr.orderBy('sys_created_on')
        gr.query()
        while (gr.next()) {
            ids.push(gr.getUniqueValue() + '')
        }
        return ids
    },

    /**
     * Writes 100, 200, 300 ... onto a list of siblings in the given order.
     *
     * Every move rewrites the whole sibling list rather than swapping two
     * values. Swapping looks cheaper but does nothing at all when two rows
     * share an order - which authored-by-hand data does - and a list is only
     * ever a handful of rows.
     */
    _authorResequence: function (cfg, ids) {
        var written = 0
        for (var i = 0; i < ids.length; i++) {
            var gr = new GlideRecordSecure(cfg.table)
            if (!gr.get(ids[i])) {
                continue
            }
            var wanted = (i + 1) * 100
            if (this._toInt(gr.getValue('order')) === wanted) {
                continue
            }
            gr.setValue('order', wanted)
            if (gr.update()) {
                written++
            }
        }
        return written
    },

    /** Task Results that a delete would take with it, for the confirm step. */
    _authorResultCount: function (type, sysId) {
        var taskIds = []
        var gr

        if (type === 'task') {
            taskIds.push(sysId)
        } else if (type === 'section') {
            gr = new GlideRecordSecure(LAB_T_TASK)
            gr.addQuery('plan_section', sysId)
            gr.query()
            while (gr.next()) {
                taskIds.push(gr.getUniqueValue() + '')
            }
        } else if (type === 'plan') {
            taskIds = this._planTaskIds(sysId)
        }

        if (!taskIds.length) {
            return 0
        }

        var count = new GlideAggregate(LAB_T_RESULT)
        count.addQuery('plan_task', 'IN', taskIds.join(','))
        count.addAggregate('COUNT')
        count.query()
        return count.next() ? this._toInt(count.getAggregate('COUNT')) : 0
    },

    /** Every plan an author may see, drafts and closed ones included. */
    getAuthoringPlans: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var plans = []
        var gr = new GlideRecordSecure(LAB_T_PLAN)
        gr.orderBy('name')
        gr.query()
        while (gr.next()) {
            plans.push({
                sys_id: gr.getUniqueValue() + '',
                name: this._str(gr.getValue('name')),
                description: this._str(gr.getValue('description')),
                status: this._str(gr.getValue('status')),
                slug: this._slug(this._str(gr.getValue('name'))),
            })
        }

        this._send(response, 200, { plans: plans })
    },

    /**
     * One plan as the whole authoring tree.
     *
     * Deliberately not getPlan: that one is written for a participant and
     * hides anything unpublished, carries their results and backfills rows on
     * read. An author needs the draft, and needs it to stay read-only.
     */
    getAuthoringPlan: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var planId = this._pathParam(request, 'plan_id')
        if (!planId) {
            this._send(response, 400, { error: 'plan_id is required' })
            return
        }

        var plan = this._resolvePlan(planId)
        if (!plan) {
            this._send(response, 404, { error: 'Evaluation Plan not found or not accessible' })
            return
        }
        var planSysId = plan.getUniqueValue() + ''

        var sections = []
        var sectionById = {}
        var sg = new GlideRecordSecure(LAB_T_SECTION)
        sg.addQuery('evaluation_plan', planSysId)
        sg.orderBy('order')
        sg.orderBy('sys_created_on')
        sg.query()
        while (sg.next()) {
            var section = {
                sys_id: sg.getUniqueValue() + '',
                title: this._str(sg.getValue('title')),
                overview: this._str(sg.getValue('overview')),
                order: this._toInt(sg.getValue('order')),
                tasks: [],
            }
            sectionById[section.sys_id] = section
            sections.push(section)
        }

        var taskById = {}
        if (sections.length) {
            var tg = new GlideRecordSecure(LAB_T_TASK)
            tg.addQuery('plan_section', 'IN', Object.keys(sectionById).join(','))
            tg.orderBy('order')
            tg.orderBy('sys_created_on')
            tg.query()
            while (tg.next()) {
                var task = {
                    sys_id: tg.getUniqueValue() + '',
                    plan_section: this._str(tg.getValue('plan_section')),
                    title: this._str(tg.getValue('title')),
                    description: this._str(tg.getValue('description')),
                    scenario: this._str(tg.getValue('scenario')),
                    how_to_test: this._str(tg.getValue('how_to_test')),
                    dependency_note: this._str(tg.getValue('dependency_note')),
                    order: this._toInt(tg.getValue('order')),
                    prompts: [],
                    criteria: [],
                }
                taskById[task.sys_id] = task
                if (sectionById[task.plan_section]) {
                    sectionById[task.plan_section].tasks.push(task)
                }
            }
        }

        var taskIds = Object.keys(taskById)
        if (taskIds.length) {
            var pg = new GlideRecordSecure(LAB_T_PROMPT)
            pg.addQuery('plan_task', 'IN', taskIds.join(','))
            pg.orderBy('order')
            pg.orderBy('sys_created_on')
            pg.query()
            while (pg.next()) {
                var promptTask = this._str(pg.getValue('plan_task'))
                if (taskById[promptTask]) {
                    taskById[promptTask].prompts.push({
                        sys_id: pg.getUniqueValue() + '',
                        plan_task: promptTask,
                        label: this._str(pg.getValue('label')),
                        prompt_text: this._str(pg.getValue('prompt_text')),
                        order: this._toInt(pg.getValue('order')),
                    })
                }
            }

            var cg = new GlideRecordSecure(LAB_T_CRITERION)
            cg.addQuery('plan_task', 'IN', taskIds.join(','))
            cg.orderBy('order')
            cg.orderBy('sys_created_on')
            cg.query()
            while (cg.next()) {
                var criterionTask = this._str(cg.getValue('plan_task'))
                if (taskById[criterionTask]) {
                    taskById[criterionTask].criteria.push({
                        sys_id: cg.getUniqueValue() + '',
                        plan_task: criterionTask,
                        criterion: this._str(cg.getValue('criterion')),
                        order: this._toInt(cg.getValue('order')),
                    })
                }
            }
        }

        this._send(response, 200, {
            plan: {
                sys_id: planSysId,
                name: this._str(plan.getValue('name')),
                description: this._str(plan.getValue('description')),
                status: this._str(plan.getValue('status')),
                slug: this._slug(this._str(plan.getValue('name'))),
            },
            sections: sections,
        })
    },

    /** POST /authoring/{type}: create a node under a parent. */
    createNode: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var type = this._pathParam(request, 'type')
        var cfg = this._authorType(type)
        if (!cfg) {
            this._send(response, 400, { error: 'Unknown node type: ' + type })
            return
        }

        var body = this._parseBody(request)
        if (body === null) {
            this._send(response, 400, { error: 'Body is not valid JSON' })
            return
        }

        var parentId = this._str(body.parent_id)
        if (cfg.parent && !parentId) {
            this._send(response, 400, { error: 'parent_id is required for a ' + type })
            return
        }

        var read = this._authorValues(cfg, body, true)
        if (read.error) {
            this._send(response, 400, { error: read.error })
            return
        }

        var gr = new GlideRecordSecure(cfg.table)
        gr.initialize()
        if (cfg.parent) {
            gr.setValue(cfg.parent, parentId)
        }
        for (var field in read.values) {
            if (Object.prototype.hasOwnProperty.call(read.values, field)) {
                gr.setValue(field, read.values[field])
            }
        }
        // Last in its list. The resequence below gives it a tidy order value.
        if (cfg.ordered) {
            gr.setValue('order', 100000)
        }

        var newId = gr.insert()
        if (!newId) {
            this._send(response, 403, { error: 'Not permitted to create a ' + type })
            return
        }
        newId = newId + ''

        if (cfg.ordered) {
            this._authorResequence(cfg, this._authorSiblings(cfg, parentId))
        }

        this._send(response, 200, { sys_id: newId, type: type })
    },

    /** PATCH /authoring/{type}/{sys_id}: change a node's own fields. */
    patchNode: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var type = this._pathParam(request, 'type')
        var cfg = this._authorType(type)
        if (!cfg) {
            this._send(response, 400, { error: 'Unknown node type: ' + type })
            return
        }

        var sysId = this._pathParam(request, 'sys_id')
        var body = this._parseBody(request)
        if (body === null) {
            this._send(response, 400, { error: 'Body is not valid JSON' })
            return
        }

        var read = this._authorValues(cfg, body, false)
        if (read.error) {
            this._send(response, 400, { error: read.error })
            return
        }

        var gr = new GlideRecordSecure(cfg.table)
        if (!gr.get(sysId)) {
            this._send(response, 404, { error: type + ' not found or not accessible' })
            return
        }

        var touched = 0
        for (var field in read.values) {
            if (Object.prototype.hasOwnProperty.call(read.values, field)) {
                gr.setValue(field, read.values[field])
                touched++
            }
        }
        if (!touched) {
            this._send(response, 400, { error: 'No writable field in the body' })
            return
        }

        if (!gr.update()) {
            this._send(response, 403, { error: 'Not permitted to change this ' + type })
            return
        }

        this._send(response, 200, { sys_id: sysId, type: type })
    },

    /**
     * DELETE /authoring/{type}/{sys_id}
     *
     * Deleting a plan, a section or a task cascades to the Task Results
     * underneath it, which is a participant's progress. So the first attempt
     * reports how much would go and refuses; the client repeats it with
     * ?confirm=true once the author has seen the number.
     */
    deleteNode: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var type = this._pathParam(request, 'type')
        var cfg = this._authorType(type)
        if (!cfg) {
            this._send(response, 400, { error: 'Unknown node type: ' + type })
            return
        }

        var sysId = this._pathParam(request, 'sys_id')
        var gr = new GlideRecordSecure(cfg.table)
        if (!gr.get(sysId)) {
            this._send(response, 404, { error: type + ' not found or not accessible' })
            return
        }

        var parentId = cfg.parent ? this._str(gr.getValue(cfg.parent)) : ''
        var confirmed = this._str(request.queryParams ? request.queryParams.confirm : '') === 'true'

        if (!confirmed) {
            var results = this._authorResultCount(type, sysId)
            if (results > 0) {
                this._send(response, 409, {
                    error: 'Deleting this ' + type + ' also deletes participant progress',
                    requires_confirm: true,
                    task_results: results,
                })
                return
            }
        }

        if (!gr.deleteRecord()) {
            this._send(response, 403, { error: 'Not permitted to delete this ' + type })
            return
        }

        if (cfg.ordered) {
            this._authorResequence(cfg, this._authorSiblings(cfg, parentId))
        }

        this._send(response, 200, { sys_id: sysId, type: type, deleted: true })
    },

    /** POST /authoring/{type}/{sys_id}/move with {"direction":"up"|"down"}. */
    moveNode: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var type = this._pathParam(request, 'type')
        var cfg = this._authorType(type)
        if (!cfg) {
            this._send(response, 400, { error: 'Unknown node type: ' + type })
            return
        }
        if (!cfg.ordered) {
            this._send(response, 400, { error: 'A ' + type + ' has no order to change' })
            return
        }

        var body = this._parseBody(request)
        if (body === null) {
            this._send(response, 400, { error: 'Body is not valid JSON' })
            return
        }
        var direction = this._str(body.direction)
        if (direction !== 'up' && direction !== 'down') {
            this._send(response, 400, { error: 'direction must be up or down' })
            return
        }

        var sysId = this._pathParam(request, 'sys_id')
        var gr = new GlideRecordSecure(cfg.table)
        if (!gr.get(sysId)) {
            this._send(response, 404, { error: type + ' not found or not accessible' })
            return
        }

        var parentId = this._str(gr.getValue(cfg.parent))
        var ids = this._authorSiblings(cfg, parentId)
        var at = ids.indexOf(sysId)
        var to = direction === 'up' ? at - 1 : at + 1

        if (at < 0 || to < 0 || to >= ids.length) {
            // Already at the end it was asked to move towards.
            this._send(response, 200, { sys_id: sysId, type: type, moved: false })
            return
        }

        ids[at] = ids[to]
        ids[to] = sysId
        this._authorResequence(cfg, ids)

        this._send(response, 200, { sys_id: sysId, type: type, moved: true })
    },

    type: 'LabApi',
}
