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
var LAB_T_USER_ROLE = 'sys_user_role'
var LAB_T_EXPECTATION = 'x_snc_holg_task_expectation'
var LAB_T_UPDATE_XML = 'sys_update_xml'
var LAB_T_SCOPE = 'sys_scope'
var LAB_T_EVENT = 'x_snc_holg_event'
var LAB_T_REGISTRATION = 'x_snc_holg_registration'
var LAB_T_USER_HAS_ROLE = 'sys_user_has_role'

// Roles
var LAB_ROLE_FACILITATOR = 'x_snc_holg.facilitator'
var LAB_ROLE_PARTICIPANT = 'x_snc_holg.participant'
var LAB_ROLE_AUTHOR = 'x_snc_holg.author'

// Stored choice values, exactly as defined on the tables
var LAB_PLAN_PUBLISHED = 'published'
var LAB_PARTICIPANT_NOT_STARTED = 'not_started'
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
        fields: ['name', 'description', 'status', 'facilitator'],
        mandatory: ['name'],
        limits: { name: 120, description: 4000, facilitator: 32 },
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
     *   5. keep the first 4 words and join with '-', or `maxWords` of them
     *   6. original letter case is preserved
     *
     * 'Now Assist for Creator'  -> 'Now-Assist-for-Creator'
     * 'Generate a server-side ATF test' -> 'Generate-server-side-ATF'
     * Returns '' for null/empty input.
     */
    _slug: function (text, maxWords) {
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
        return use.slice(0, maxWords || LAB_SLUG_MAX_WORDS).join('-')
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
     * Allocation is race-safe, in three parts that only work together:
     *
     *  - a UNIQUE index on (evaluation_plan, participant_number), so the
     *    database refuses a duplicate instead of accepting one;
     *  - the number is set ON THE INSERT, not written afterwards, so there is
     *    no window in which a row exists without one;
     *  - a refused insert is retried: the next pass re-reads what is taken,
     *    sees the winner's row and picks the next free number.
     *
     * Two people opening the plan in the same instant therefore get two
     * different numbers, rather than the same one twice.
     * ------------------------------------------------------------ */

    /**
     * How many times an insert may lose the race before giving up.
     *
     * Each retry costs one read and one insert, and only a genuine collision
     * triggers one, so a small number is enough: five simultaneous enrolments
     * would all have to collide in sequence to exhaust it.
     */
    _NUMBER_ATTEMPTS: 5,

    /** The trailing digits of the caller's user name, or 0 if it has none. */
    _numberFromUserName: function () {
        var match = /(\d+)\s*$/.exec(gs.getUserName() + '')
        return match ? parseInt(match[1], 10) : 0
    },

    /**
     * The numbers already handed out in a plan, as a lookup by number.
     *
     * `GlideRecord`, and deliberately not `GlideRecordSecure` as everywhere
     * else in this class. A participant may read only their OWN Plan
     * Participant row, so a secure read here returns one row and every
     * participant is told they are number 1 - which is exactly what happened
     * before: it looked correct only because the facilitator and the admin who
     * tested it can read every row.
     *
     * The exception is narrow and safe: this reads one integer column, uses it
     * to pick the next free number, and never returns any of it to a caller.
     * Nothing about another participant reaches the client from here.
     */
    _takenNumbers: function (planId) {
        var taken = {}
        var pp = new GlideRecord(LAB_T_PARTICIPANT)
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
     * The number this caller should get in this plan, read fresh each time.
     *
     * A lab account whose user name ends in digits keeps that number while it
     * is free, so a pre-named roster lines up with itself; otherwise it is the
     * lowest number not already taken.
     */
    _allocateNumber: function (planId) {
        var taken = this._takenNumbers(planId)
        var number = this._numberFromUserName()
        if (!number || taken[number]) {
            number = this._lowestFreeNumber(taken)
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
     * Only rows enrolled before numbers existed reach this: enrolment now sets
     * the number on the insert. It writes only when the number is still
     * missing, so a number never moves once assigned, and a write the unique
     * index refuses is retried against a fresh read rather than swallowed.
     *
     * Failing all attempts leaves the number at 0, which the client shows as
     * unassigned - the caller is a read that must still succeed.
     */
    _ensureParticipantNumber: function (planId, gr) {
        if (!gr || this._toInt(gr.getValue('participant_number')) > 0) {
            return
        }
        for (var attempt = 0; attempt < this._NUMBER_ATTEMPTS; attempt++) {
            var number = this._allocateNumber(planId)
            var backfillPrefix = this._prefixFor(number, this._initialsFor())
            gr.setValue('participant_number', number)
            gr.setValue('prefix', backfillPrefix)
            gr.setValue('app_scope', 'x_snc_' + backfillPrefix)
            try {
                if (gr.update()) {
                    return
                }
            } catch (e) {
                // Someone took this number in between. Round again.
            }
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

        // The number goes on the insert, so the row never exists without one
        // and the unique index can do its job. A refused insert is either that
        // index rejecting a number someone else just took, or another request
        // enrolling this same user - both are settled by looking again.
        var newId = null
        for (var attempt = 0; attempt < this._NUMBER_ATTEMPTS && !newId; attempt++) {
            var number = this._allocateNumber(planId)
            var pp = new GlideRecordSecure(LAB_T_PARTICIPANT)
            pp.initialize()
            pp.setValue('evaluation_plan', planId)
            pp.setValue('user', gs.getUserID())
            pp.setValue('status', LAB_PARTICIPANT_IN_PROGRESS)
            pp.setValue('started_on', this._now())
            pp.setValue('percent_complete', 0)
            var prefix = this._prefixFor(number, this._initialsFor())
            pp.setValue('participant_number', number)
            pp.setValue('prefix', prefix)
            // The scope the setup task tells them to build in. Stored so the
            // artifact tracker and the page cannot disagree about it.
            pp.setValue('app_scope', 'x_snc_' + prefix)

            try {
                newId = pp.insert()
            } catch (e) {
                newId = null
            }

            if (!newId) {
                var raced = this._findParticipant(planId)
                if (raced) {
                    return {
                        sys_id: raced.getUniqueValue() + '',
                        created: false,
                        participant: raced,
                    }
                }
            }
        }

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
            // Granted, not effective: an admin who has not been given an app
            // role is not a facilitator here, and the UI should say so rather
            // than show them a dashboard the REST layer will refuse.
            isFacilitator: this.holdsAppRole(LAB_ROLE_FACILITATOR),
            isParticipant: this.holdsAppRole(LAB_ROLE_PARTICIPANT),
            isAuthor: this.holdsAppRole(LAB_ROLE_AUTHOR),
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
        if (this.holdsAppRole(LAB_ROLE_PARTICIPANT)) {
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
     * Self-registration for a lab event
     *
     * Called from the public registration widget, which is the only part of
     * this application reachable without a session. Everything here therefore
     * assumes the caller may be `guest` and may be hostile: every value is
     * re-read from the event record rather than trusted from the form, and the
     * only thing the form can influence is which event and what the person is
     * called.
     *
     * Reads use plain `GlideRecord` throughout. A guest satisfies no ACL, so a
     * secure read would see nothing and every registration would fail as if the
     * event did not exist. The containment is that nothing read here is
     * returned to the caller beyond the event's own name and dates.
     * ------------------------------------------------------------ */

    /** True when nobody is signed in. The whole flow branches on this. */
    isGuest: function () {
        var name = gs.getUserName() + ''
        return !name || name === 'guest'
    },

    /**
     * The event a registration link names, as the page needs it.
     *
     * Matched on the slug of the name, the same readable form `plan_id` uses,
     * or on a sys_id. Returns null rather than an error when nothing matches:
     * a bad link should not say whether an event exists.
     */
    registrationEvent: function (slugOrId) {
        var wanted = this._str(slugOrId).toLowerCase()
        if (!wanted) {
            return null
        }

        var gr = new GlideRecord(LAB_T_EVENT)
        gr.query()
        var match = null
        while (gr.next()) {
            var name = this._str(gr.getValue('name'))
            if (
                (gr.getUniqueValue() + '').toLowerCase() === wanted ||
                this._eventSlug(name).toLowerCase() === wanted ||
                this._eventSlugDated(gr).toLowerCase() === wanted
            ) {
                match = gr
                break
            }
        }
        if (!match) {
            return null
        }

        var state = this._eventState(match)
        return {
            sys_id: match.getUniqueValue() + '',
            name: this._str(match.getValue('name')),
            when: this._eventWhen(match),
            accepting: state.accepting,
            closed_message: state.message,
            // The form asks for a code only when there is one to ask for.
            needs_code: !!this._str(match.getValue('registration_code')).trim(),
        }
    },

    /**
     * An event's slug, from its WHOLE name rather than the first four words.
     *
     * A plan slug is typed by a person, so four words is a kindness. An event
     * slug only ever appears in a link somebody is sent, and four words makes
     * "Customer Workshop November 13th 2026" and the same workshop in 2027 the
     * same string - a link for one would open the other.
     */
    _eventSlug: function (name) {
        return this._slug(name, 50)
    },

    /**
     * The slug with the start date on the end: `Customer-Workshop-2026-11-13`.
     *
     * Once the date moved out of the name, two years of the same workshop share
     * a name and therefore a slug. A link carries the date so it still points at
     * one event; both forms are accepted on the way in, so the plain name keeps
     * working when there is only one.
     */
    _eventSlugDated: function (gr) {
        var base = this._eventSlug(this._str(gr.getValue('name')))
        var starts = this._str(gr.getValue('starts_on'))
        if (!base || !starts) {
            return ''
        }
        var day = (new GlideDateTime(starts).getDate() + '').split(' ')[0]
        return day ? base + '-' + day : ''
    },

    /**
     * The event's dates as a person would write them: "13 November 2026".
     *
     * The date belongs on the record, not in the name - an event called
     * "Customer Workshop November 13th 2026" cannot be sorted, filtered or
     * repeated next year. The page shows the name as its title and this
     * underneath.
     *
     * Month names are spelled out here rather than taken from a format string,
     * because a date a stranger reads off a phone must not depend on the
     * instance's locale or on glide.sys.date_format being something sensible.
     */
    _eventWhen: function (gr) {
        var starts = this._dayWords(this._str(gr.getValue('starts_on')))
        var ends = this._dayWords(this._str(gr.getValue('ends_on')))

        if (starts && ends && starts !== ends) {
            return starts + ' to ' + ends
        }
        return starts || ends
    },

    /**
     * Form values worked out from an email address, for `?email=` in the URL.
     *
     * A testing affordance, and deliberately only a prefill: the form still has
     * to be submitted. A URL that created an account on GET would hand one out
     * to every crawler, link preview and prefetching browser that ever saw it.
     *
     * `jane.doe@example.com` gives Jane and Doe; a local part with no separator
     * gives a first name and an empty surname for the person to finish.
     */
    registrationPrefill: function (email) {
        var address = this._str(email).trim().toLowerCase()
        if (!address || address.indexOf('@') < 1) {
            return { email: '', first_name: '', last_name: '' }
        }

        var words = address.split('@')[0].split(/[._+-]+/)
        var named = []
        for (var i = 0; i < words.length && named.length < 2; i++) {
            var word = words[i].replace(/[^a-z]/g, '')
            if (word) {
                named.push(word.charAt(0).toUpperCase() + word.slice(1))
            }
        }

        return {
            email: address,
            first_name: named[0] || '',
            last_name: named[1] || '',
        }
    },

    /** One date as '13 November 2026', or '' when there is nothing to show. */
    _dayWords: function (value) {
        if (!value) {
            return ''
        }
        var months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ]
        var gdt = new GlideDateTime(value)
        // getDate() gives yyyy-MM-dd in the system timezone, which is what a
        // workshop date is: a day, not an instant.
        var parts = (gdt.getDate() + '').split('-')
        if (parts.length !== 3) {
            return ''
        }
        var month = months[this._toInt(parts[1]) - 1]
        return month ? this._toInt(parts[2]) + ' ' + month + ' ' + parts[0] : ''
    },

    /**
     * Whether an event is accepting registrations, and what to say when not.
     *
     * Four conditions, all on the record: open, started, not finished, not
     * full. The message is deliberately the same shape for all of them - a
     * visitor does not need to know which one they failed, and a code-guesser
     * should not be told either.
     */
    _eventState: function (gr) {
        var shut = {
            accepting: false,
            message: 'This workshop is not accepting registrations.',
        }

        if (this._str(gr.getValue('status')) !== 'open') {
            return shut
        }

        var now = new GlideDateTime()
        var starts = this._str(gr.getValue('starts_on'))
        if (starts && now.compareTo(new GlideDateTime(starts)) < 0) {
            return {
                accepting: false,
                message: 'Registration for this workshop has not opened yet.',
            }
        }
        var ends = this._str(gr.getValue('ends_on'))
        if (ends && now.compareTo(new GlideDateTime(ends)) > 0) {
            return shut
        }

        var capacity = this._toInt(gr.getValue('capacity'))
        if (capacity > 0 && this._registrationCount(gr.getUniqueValue() + '') >= capacity) {
            return { accepting: false, message: 'This workshop is full.' }
        }

        return { accepting: true, message: '' }
    },

    /** How many people have registered for an event. */
    _registrationCount: function (eventId) {
        var agg = new GlideAggregate(LAB_T_REGISTRATION)
        agg.addQuery('event', eventId)
        agg.addAggregate('COUNT')
        agg.query()
        return agg.next() ? this._toInt(agg.getAggregate('COUNT')) : 0
    },

    /**
     * Register for an event, or join it with the account you already have.
     *
     * Returns a plain object for the widget: { ok, heading, message,
     * user_name, password, lab_url }. A password comes back exactly once, for
     * an account that was created in this call, and is never stored anywhere
     * readable or written to a log.
     */
    register: function (eventId, form) {
        var gr = new GlideRecord(LAB_T_EVENT)
        if (!gr.get(eventId)) {
            return this._registerFailed('This workshop could not be found.')
        }

        // Re-checked here and not taken from the page: the page was rendered
        // before the form was filled in, and an event can close in between.
        var state = this._eventState(gr)
        if (!state.accepting) {
            return this._registerFailed(state.message)
        }

        /*
         * A code is required only when the event defines one. Blank means the
         * link itself is the invitation, which is what most events here want;
         * the remaining gates are the event's status, its window and its cap.
         */
        var expected = this._str(gr.getValue('registration_code')).trim()
        if (expected) {
            var given = this._str(form.code).trim()
            if (given.toLowerCase() !== expected.toLowerCase()) {
                return this._registerFailed('That registration code is not right.')
            }
        }

        return this.isGuest()
            ? this._registerNewAccount(gr, form)
            : this._joinAsCurrentUser(gr)
    },

    _registerFailed: function (message) {
        return { ok: false, message: message }
    },

    /**
     * A signed-in visitor joins with the account they already have.
     *
     * Their password is never touched and nothing is shown back to them. This
     * is the normal path on a customer's own instance, where everybody already
     * exists and their credentials are theirs.
     */
    _joinAsCurrentUser: function (eventGr) {
        var userId = gs.getUserID() + ''
        var email = this._str(gs.getUser().getEmail())

        var granted = this._grantEventRoles(eventGr, userId)
        var registrationId = this._recordRegistration(eventGr, {
            first_name: this._str(gs.getUser().getFirstName()),
            last_name: this._str(gs.getUser().getLastName()),
            email: email || gs.getUserName() + '',
            status: 'joined',
            user: userId,
            granted_roles: granted.join(','),
        })
        this._enrolInEventPlan(eventGr, userId)

        var viaGlobal = this._grantThroughGlobal(registrationId)
        if (viaGlobal.granted.length) {
            this._recordRegistration(eventGr, {
                email: email || gs.getUserName() + '',
                status: 'joined',
                user: userId,
                granted_roles: viaGlobal.granted.join(','),
            })
        }

        return {
            ok: true,
            heading: 'You are in',
            message:
                'Your account now has what this workshop needs. Sign in as you normally do - your password has not been changed.',
            user_name: gs.getUserName() + '',
            password: '',
            lab_url: this._labUrl(eventGr),
        }
    },

    /**
     * A visitor with no session gets an account - unless they already have one.
     *
     * The order of these checks is the point. Matching the email BEFORE the
     * user name is what stops one person ending up with two accounts: a name
     * collision is only a different person when the email differs too.
     */
    _registerNewAccount: function (eventGr, form) {
        var first = this._str(form.first_name).trim()
        var last = this._str(form.last_name).trim()
        var email = this._str(form.email).trim().toLowerCase()

        if (!first || !last || !email || email.indexOf('@') < 1) {
            return this._registerFailed('Please give your first name, last name and email address.')
        }

        // 1. Already a user here? Then never create, and never grant on the
        //    strength of an email nobody has verified.
        var existing = this._userByEmail(email)
        if (existing) {
            this._recordRegistration(eventGr, {
                first_name: first,
                last_name: last,
                email: email,
                status: 'awaiting_sign_in',
                user: existing,
                granted_roles: '',
            })
            /*
             * Sent back to THIS page, not to the lab.
             *
             * Sending them to the lab was tried and it 404s: the plan page
             * requires x_snc_holg.participant, and this branch grants nothing -
             * it cannot, because an email nobody has verified is not proof of
             * anything. So they go to the lab with no role and the portal
             * refuses them, which looks broken and is unexplainable.
             *
             * Coming back here is the shape that works. Signing in satisfies
             * the one thing missing, the signed-in branch grants the roles, and
             * the page then offers the lab. The URL is passed through the login
             * redirect, so one sign-in lands them straight back on it.
             */
            var backHere = this._registrationUrl(eventGr)
            return {
                ok: true,
                heading: 'You already have an account here',
                message:
                    'Signing you in. Use the credentials you already have, and you will come straight back here to join the workshop.',
                user_name: '',
                password: '',
                lab_url: '',
                redirect: '/login.do?sysparm_url=' + encodeURIComponent(backHere),
            }
        }

        // 2. A free user name, suffixed only when a DIFFERENT person holds it.
        var login = this._freeUserName(first, last)
        var password = this._generatePassword(first, last)

        var userId = null
        try {
            var u = new GlideRecord(LAB_T_USER)
            u.initialize()
            u.setValue('user_name', login)
            u.setValue('first_name', first)
            u.setValue('last_name', last)
            u.setValue('email', email)
            u.setValue('active', true)
            u.setValue('locked_out', false)
            u.setValue('web_service_access_only', false)
            userId = u.insert()

            if (userId) {
                /*
                 * setDisplayValue, NOT setValue. setValue stores a value, throws
                 * nothing, leaves the record looking correct - and the account
                 * cannot log in. Verified against this instance: 401 with
                 * setValue, 200 with setDisplayValue.
                 */
                var fresh = new GlideRecord(LAB_T_USER)
                fresh.get(userId)
                fresh.user_password.setDisplayValue(password)
                fresh.update()

                /*
                 * Cleared in a SEPARATE update, after the password write.
                 * Setting it in the same update does not stick - the platform
                 * turns it back on when the password changes, and the first
                 * live registration proved it: the row came out with
                 * password_needs_reset = 1 and the participant was asked to
                 * change a password they had just been handed.
                 *
                 * A training account for one workshop does not need rotating.
                 */
                var settle = new GlideRecord(LAB_T_USER)
                settle.get(userId)
                settle.setValue('password_needs_reset', false)
                settle.update()
            }
        } catch (e) {
            userId = null
        }

        if (!userId) {
            this._recordRegistration(eventGr, {
                first_name: first,
                last_name: last,
                email: email,
                status: 'failed',
                user: '',
                granted_roles: '',
                failure_reason: 'The account could not be created.',
            })
            return this._registerFailed(
                'Your account could not be created. Tell your facilitator - your registration has been recorded.',
            )
        }

        var granted = this._grantEventRoles(eventGr, userId)
        var registrationId = this._recordRegistration(eventGr, {
            first_name: first,
            last_name: last,
            email: email,
            status: 'created',
            user: userId,
            granted_roles: granted.join(','),
        })
        this._enrolInEventPlan(eventGr, userId)

        /* The registration has to exist before the bridge runs: it reads the
         * roles off that row's own event rather than taking a role name, so it
         * cannot be used to grant something nobody asked for. */
        var viaGlobal = this._grantThroughGlobal(registrationId)
        if (viaGlobal.granted.length) {
            this._recordRegistration(eventGr, {
                email: email,
                status: 'created',
                user: userId,
                granted_roles: viaGlobal.granted.join(','),
            })
        }

        return {
            ok: true,
            heading: 'You are registered',
            message: 'Use these to sign in.',
            user_name: login,
            password: password,
            lab_url: this._labUrl(eventGr),
        }
    },

    /** The sys_id of a user with this email, or '' - matched case-insensitively. */
    _userByEmail: function (email) {
        var gr = new GlideRecord(LAB_T_USER)
        gr.addQuery('email', email)
        gr.setLimit(1)
        gr.query()
        if (gr.next()) {
            return gr.getUniqueValue() + ''
        }
        // Some instances store it mixed-case; the query above is exact.
        var any = new GlideRecord(LAB_T_USER)
        any.addQuery('email', 'CONTAINS', email)
        any.query()
        while (any.next()) {
            if (this._str(any.getValue('email')).toLowerCase() === email) {
                return any.getUniqueValue() + ''
            }
        }
        return ''
    },

    /**
     * first.last, suffixed until it is free.
     *
     * Only reached when the email did not match, so a collision here really is
     * a different person with the same name rather than the same person twice.
     */
    _freeUserName: function (first, last) {
        var base = (first + '.' + last).toLowerCase().replace(/[^a-z0-9.]/g, '')
        if (!base || base === '.') {
            base = 'lab.participant'
        }
        var candidate = base
        var suffix = 1
        while (this._userNameTaken(candidate) && suffix < 50) {
            suffix++
            candidate = base + suffix
        }
        return candidate
    },

    _userNameTaken: function (login) {
        var gr = new GlideRecord(LAB_T_USER)
        gr.addQuery('user_name', login)
        gr.setLimit(1)
        gr.query()
        return gr.next()
    },

    /**
     * A password a person can read off a screen and type without a mistake,
     * which also satisfies the instance's password policy.
     *
     * Shaped `Quartz-47-Harbor`: two capitalised words around two digits. That
     * is not decoration - each part is there to clear a rule:
     *
     *   Capitals        at least 1 uppercase
     *   The words       at least 1 lowercase
     *   The digits      at least 1 numeric
     *   The hyphens     at least 1 special, and `-` is whitelisted by both
     *                   policies on this instance (Medium allows `!@#$%&*?+-=`,
     *                   Default Strong whitelists nothing, so permits all)
     *   ~16 characters  past Medium's 12 as well as Default Strong's 8
     *
     * The first version was all lowercase - `quartz-47-harbor` - which failed
     * the uppercase rule and nothing else. A password that violates policy is
     * accepted at the point it is set and then forces a change at first login,
     * so the participant was handed a password and immediately asked to pick a
     * different one.
     *
     * `first` and `last` are used to honour "no user data": a word that appears
     * in the person's own name is dropped from the pool, because a participant
     * named Harbor would otherwise be handed a password containing it.
     */
    _generatePassword: function (first, last) {
        var words = [
            'Amber', 'Basalt', 'Cedar', 'Delta', 'Ember', 'Flint', 'Granite', 'Harbor',
            'Indigo', 'Juniper', 'Kelvin', 'Lantern', 'Marble', 'Nectar', 'Onyx',
            'Quartz', 'Ridge', 'Summit', 'Tundra', 'Umber', 'Vertex', 'Walnut',
        ]

        var name = (this._str(first) + ' ' + this._str(last)).toLowerCase()
        var usable = []
        for (var i = 0; i < words.length; i++) {
            if (name.indexOf(words[i].toLowerCase()) < 0) {
                usable.push(words[i])
            }
        }
        if (usable.length < 2) {
            usable = words
        }

        function pick(list) {
            return list[Math.floor(Math.random() * list.length)]
        }

        var one = pick(usable)
        var two = pick(usable)
        // Two different words, so "no repetition" cannot be argued either way.
        while (two === one && usable.length > 1) {
            two = pick(usable)
        }

        var digits = '' + (Math.floor(Math.random() * 90) + 10)
        return one + '-' + digits + '-' + two
    },

    /**
     * Grants the lab role plus whatever the event names, and reports what stuck.
     *
     * The event's `granted_roles` is read per event rather than hardcoded, so
     * the same code grants `admin` on a lab instance and nothing but the
     * participant role on a customer's.
     */
    /** True when a role belongs to this application rather than to Global. */
    _roleIsOurs: function (roleName) {
        var name = this._str(roleName)
        return name.indexOf('x_snc_holg.') === 0
    },

    /**
     * Hands the out-of-scope roles to global.HolgEventRoles.
     *
     * x_snc_holg can grant its own roles and nothing else: `admin` belongs to
     * Global, so the insert is a cross-scope write and is refused for any
     * caller who is not an admin - which is every registrant. The bridge is a
     * Script Include whose own scope is Global, so the same insert is no longer
     * cross-scope. See src/global-scope/HolgEventRoles.js.
     *
     * Absent, this returns empty and the roles simply stay ungranted: the
     * account, the lab role and the enrolment are already done by then, so a
     * missing bridge costs the extra access and nothing else.
     */
    _grantThroughGlobal: function (registrationId) {
        if (!registrationId) {
            return { granted: [], error: 'no registration' }
        }
        try {
            var bridge = new global.HolgEventRoles()
            var answer = bridge.grantForRegistration(registrationId)
            return {
                granted: (answer && answer.granted) || [],
                error: (answer && answer.error) || '',
            }
        } catch (e) {
            // Not installed, or not callable from this scope.
            return { granted: [], error: '' + e }
        }
    },

    _grantEventRoles: function (eventGr, userId) {
        var wanted = [LAB_ROLE_PARTICIPANT]
        var extra = this._str(eventGr.getValue('granted_roles')).split(',')
        for (var i = 0; i < extra.length; i++) {
            var name = this._str(extra[i]).trim()
            if (name && wanted.indexOf(name) < 0) {
                wanted.push(name)
            }
        }

        var granted = []
        for (i = 0; i < wanted.length; i++) {
            /*
             * Only this app's own roles are granted here. Attempting a Global
             * role from this scope does not merely fail - the platform pushes a
             * security message into the session, which the registrant then sees
             * on the page as a refusal, having in fact been registered
             * successfully. Those roles go through the global bridge instead.
             */
            if (!this._roleIsOurs(wanted[i])) {
                continue
            }
            var roleId = this._roleId(wanted[i])
            if (!roleId || this._userHasRole(userId, wanted[i])) {
                continue
            }
            try {
                var has = new GlideRecord(LAB_T_USER_HAS_ROLE)
                has.initialize()
                has.setValue('user', userId)
                has.setValue('role', roleId)
                if (has.insert()) {
                    granted.push(wanted[i])
                }
            } catch (e) {
                // Reported through the registration row rather than thrown: a
                // missing role should not lose the registration.
            }
        }
        return granted
    },

    /* ------------------------------------------------------------ *
     * Finishing a registration from a privileged context
     *
     * A registrant is a guest, and a guest cannot grant `admin`: the role
     * record belongs to Global, so the insert is a cross-scope write and is
     * refused for anyone who is not an admin. The scheduled job that calls this
     * runs as the system user, where that refusal does not apply - the same
     * grant from this same scope succeeds in an admin session, so what was
     * missing was never the scope privilege but the caller.
     *
     * Everything else about a registration already happened in the request:
     * the account, its password, the lab role and the enrolment. This finishes
     * the one part the public page cannot, a minute later at worst.
     * ------------------------------------------------------------ */

    /**
     * Grants every open event's roles to the registrants still missing them.
     *
     * Idempotent, so running it on a settled room does nothing and writes
     * nothing. Bounded, so a misconfigured event cannot turn one run into a
     * sweep of the whole table. Returns a summary for the job's log.
     */
    grantPendingEventRoles: function () {
        var LIMIT = 100
        var summary = { checked: 0, granted: 0, people: [], errors: [] }

        /* Open events only. A registration row outliving its workshop must not
         * still be a route to the roles that workshop handed out. */
        var events = {}
        var ev = new GlideRecord(LAB_T_EVENT)
        ev.addQuery('status', 'open')
        ev.query()
        while (ev.next()) {
            var roles = []
            var named = this._str(ev.getValue('granted_roles')).split(',')
            for (var n = 0; n < named.length; n++) {
                var role = this._str(named[n]).trim()
                if (role && roles.indexOf(role) < 0) {
                    roles.push(role)
                }
            }
            if (roles.length) {
                events[ev.getUniqueValue() + ''] = roles
            }
        }

        var eventIds = []
        for (var key in events) {
            if (Object.prototype.hasOwnProperty.call(events, key)) {
                eventIds.push(key)
            }
        }
        if (!eventIds.length) {
            return summary
        }

        var reg = new GlideRecord(LAB_T_REGISTRATION)
        reg.addQuery('event', 'IN', eventIds.join(','))
        reg.addQuery('status', 'IN', 'created,joined')
        reg.addNotNullQuery('user')
        reg.setLimit(LIMIT)
        reg.query()

        while (reg.next()) {
            summary.checked++
            var userId = this._str(reg.getValue('user'))
            var wanted = events[this._str(reg.getValue('event'))] || []
            var gained = []

            for (var i = 0; i < wanted.length; i++) {
                if (this._userHasRole(userId, wanted[i])) {
                    continue
                }
                var roleId = this._roleId(wanted[i])
                if (!roleId) {
                    summary.errors.push(wanted[i] + ' is not a role on this instance')
                    continue
                }
                try {
                    var has = new GlideRecord(LAB_T_USER_HAS_ROLE)
                    has.initialize()
                    has.setValue('user', userId)
                    has.setValue('role', roleId)
                    if (has.insert()) {
                        gained.push(wanted[i])
                    } else {
                        summary.errors.push('refused: ' + wanted[i])
                    }
                } catch (e) {
                    summary.errors.push(wanted[i] + ': ' + e)
                }
            }

            if (gained.length) {
                summary.granted += gained.length
                summary.people.push(this._str(reg.getValue('email')) + ' -> ' + gained.join(', '))

                /* The row records what it ended up with, not what the request
                 * managed at the time. */
                var already = this._str(reg.getValue('granted_roles')).split(',')
                var all = []
                for (i = 0; i < already.length + gained.length; i++) {
                    var name = this._str(
                        i < already.length ? already[i] : gained[i - already.length],
                    ).trim()
                    if (name && all.indexOf(name) < 0) {
                        all.push(name)
                    }
                }
                reg.setValue('granted_roles', all.join(','))
                reg.update()
            }
        }

        return summary
    },

    /** The event's roles this app may not grant itself. */
    _rolesNeedingGlobal: function (eventGr) {
        var pending = []
        var extra = this._str(eventGr.getValue('granted_roles')).split(',')
        for (var i = 0; i < extra.length; i++) {
            var name = this._str(extra[i]).trim()
            if (name && !this._roleIsOurs(name) && pending.indexOf(name) < 0) {
                pending.push(name)
            }
        }
        return pending
    },

    /**
     * Writes the registration row, updating one that is already there.
     *
     * An upsert rather than an insert, because registering twice for the same
     * event is a normal thing to do: somebody registered before the event's
     * `granted_roles` was set, or signed in afterwards to pick up what the
     * guest path could not grant them. Re-opening the link then grants the
     * missing roles - `_grantEventRoles` skips what is already held - and this
     * keeps the row honest about what they ended up with instead of leaving it
     * describing the first attempt.
     *
     * Never throws: by the time this runs the account exists, and losing the
     * bookkeeping must not look like a failed registration.
     */
    _recordRegistration: function (eventGr, values) {
        try {
            var email = this._str(values.email)
            var gr = new GlideRecord(LAB_T_REGISTRATION)
            gr.addQuery('event', eventGr.getUniqueValue())
            gr.addQuery('email', email)
            gr.setLimit(1)
            gr.query()

            var existing = gr.next()
            if (!existing) {
                gr = new GlideRecord(LAB_T_REGISTRATION)
                gr.initialize()
                gr.setValue('event', eventGr.getUniqueValue())
                gr.setValue('email', email)
                gr.setValue('first_name', this._str(values.first_name))
                gr.setValue('last_name', this._str(values.last_name))
            }

            gr.setValue('status', values.status)
            if (values.user) {
                gr.setValue('user', values.user)
            }

            /*
             * Roles accumulate across attempts. The second visit grants only
             * what the first one missed, so overwriting would lose the record
             * of everything the first one did grant.
             */
            var already = this._str(gr.getValue('granted_roles')).split(',')
            var adding = this._str(values.granted_roles).split(',')
            var all = []
            for (var i = 0; i < already.length + adding.length; i++) {
                var name = this._str(i < already.length ? already[i] : adding[i - already.length]).trim()
                if (name && all.indexOf(name) < 0) {
                    all.push(name)
                }
            }
            gr.setValue('granted_roles', all.join(','))

            gr.setValue('failure_reason', this._str(values.failure_reason))

            return (existing ? gr.update() : gr.insert()) + ''
        } catch (e) {
            return ''
        }
    },

    /** Enrols the new user in the event's plan, so they land on their tasks. */
    _enrolInEventPlan: function (eventGr, userId) {
        var planId = this._str(eventGr.getValue('evaluation_plan'))
        if (!planId || !userId) {
            return
        }
        var existing = new GlideRecord(LAB_T_PARTICIPANT)
        existing.addQuery('evaluation_plan', planId)
        existing.addQuery('user', userId)
        existing.setLimit(1)
        existing.query()
        if (existing.next()) {
            return
        }
        try {
            var pp = new GlideRecord(LAB_T_PARTICIPANT)
            pp.initialize()
            pp.setValue('evaluation_plan', planId)
            pp.setValue('user', userId)
            pp.setValue('status', LAB_PARTICIPANT_NOT_STARTED)
            pp.setValue('percent_complete', 0)
            pp.insert()
            // The number and prefix are left to the participant path, which
            // assigns them on first open - one place that decides a number.
        } catch (e) {
            // Enrolment also happens when they first open the plan.
        }
    },

    /** This registration page, for an event. */
    _registrationUrl: function (eventGr) {
        var slug = this._eventSlugDated(eventGr) || this._eventSlug(this._str(eventGr.getValue('name')))
        return '/holg?id=register&event=' + encodeURIComponent(slug)
    },

    /** Where to send them next. */
    _labUrl: function (eventGr) {
        var planId = this._str(eventGr.getValue('evaluation_plan'))
        if (!planId) {
            return '/holg'
        }
        var plan = new GlideRecord(LAB_T_PLAN)
        if (!plan.get(planId)) {
            return '/holg'
        }
        return '/holg?id=plan&plan=' + this._slug(this._str(plan.getValue('name')))
    },

    /* ------------------------------------------------------------ *
     * Artifact tracker
     *
     * Answers one question for a facilitator mid-workshop: who has actually
     * built the thing this task asked for?
     *
     * Evidence comes from sys_update_xml - Customer Updates - rather than from
     * reading into each participant's scope. Every metadata change lands there
     * with its table, the artifact's display name and the user name that made
     * it, so one indexed query covers the whole room, and work a participant
     * did in Global scope still counts as theirs.
     *
     * What it cannot see: data. sys_update_xml records metadata only, so an
     * expectation like "30 Claim records" is not answerable from it and is not
     * modelled here. Expectations are authored per task, because only a person
     * knows what good looks like.
     * ------------------------------------------------------------ */

    /** sys_id -> user_name, for matching against sys_update_xml.created_by. */
    _userLogins: function (ids) {
        var map = {}
        if (!ids || !ids.length) {
            return map
        }
        var gr = new GlideRecordSecure(LAB_T_USER)
        gr.addQuery('sys_id', 'IN', ids.join(','))
        gr.query()
        while (gr.next()) {
            map[gr.getUniqueValue() + ''] = this._str(gr.getValue('user_name'))
        }
        return map
    },

    /** Expectations for a set of tasks, as taskId -> [expectation]. */
    _expectationsByTask: function (taskIds) {
        var byTask = {}
        if (!taskIds.length) {
            return byTask
        }
        var gr = new GlideRecordSecure(LAB_T_EXPECTATION)
        gr.addQuery('plan_task', 'IN', taskIds.join(','))
        gr.orderBy('order')
        gr.query()
        while (gr.next()) {
            var taskId = this._str(gr.getValue('plan_task'))
            if (!byTask[taskId]) {
                byTask[taskId] = []
            }
            byTask[taskId].push({
                sys_id: gr.getUniqueValue() + '',
                label: this._str(gr.getValue('label')),
                target_table: this._str(gr.getValue('target_table')),
                name_contains: this._str(gr.getValue('name_contains')).toLowerCase(),
                minimum: Math.max(1, this._toInt(gr.getValue('minimum'))),
            })
        }
        return byTask
    },

    /**
     * Which table an update row is about.
     *
     * `sys_update_xml.table` is populated only for DATA rows - a record of a
     * scoped app's own table. For metadata, which is most of what a lab task
     * produces, it is empty and the table lives in `name` as
     * `<table>_<32 hex sys_id>`. Verified on this instance: 4,538 of the rows
     * have no `table` at all, including every Custom Application.
     */
    _updateTable: function (gr) {
        var table = this._str(gr.getValue('table'))
        if (table) {
            return table
        }
        var name = this._str(gr.getValue('name'))
        var match = /^(.*)_[0-9a-f]{32}$/.exec(name)
        return match ? match[1] : ''
    },

    /**
     * Every artifact these user names have touched in these tables.
     *
     * One query for the whole room, keyed `login|table` -> { updateName: the
     * artifact's lowercased display name }. Distinct by that update name, so
     * editing one artifact ten times still counts once. A deletion is not
     * evidence, so DELETE rows are left out.
     *
     * The query filters on the `name` prefix as well as `table`, because of
     * what _updateTable explains - and then the table is compared EXACTLY in
     * JavaScript, because a prefix is not a table: `sys_script_` also matches
     * sys_script_client and sys_script_include, which would have counted a
     * client script as a business rule.
     *
     * `GlideRecord`, like the other platform reads here: sys_update_xml is a
     * global table a facilitator has no granted access to, and nothing from it
     * reaches a caller except the counts below.
     */
    _artifactIndex: function (logins, tables) {
        var index = {}
        if (!logins.length || !tables.length) {
            return index
        }

        var wanted = {}
        var clauses = []
        for (var i = 0; i < tables.length; i++) {
            wanted[tables[i]] = true
            clauses.push('nameSTARTSWITH' + tables[i] + '_')
            clauses.push('table=' + tables[i])
        }

        var gr = new GlideRecord(LAB_T_UPDATE_XML)
        gr.addQuery('sys_created_by', 'IN', logins.join(','))
        gr.addQuery('action', '!=', 'DELETE')
        gr.addEncodedQuery(clauses.join('^OR'))
        gr.query()
        while (gr.next()) {
            var table = this._updateTable(gr)
            if (!wanted[table]) {
                continue
            }
            var key = this._str(gr.getValue('sys_created_by')) + '|' + table
            if (!index[key]) {
                index[key] = {}
            }
            index[key][this._str(gr.getValue('name'))] =
                this._str(gr.getValue('target_name')).toLowerCase()
        }
        return index
    },

    /** How many distinct artifacts one expectation has evidence for. */
    _evidenceCount: function (index, login, expectation) {
        var found = index[login + '|' + expectation.target_table]
        if (!found) {
            return 0
        }
        var count = 0
        for (var name in found) {
            if (!Object.prototype.hasOwnProperty.call(found, name)) {
                continue
            }
            if (expectation.name_contains && found[name].indexOf(expectation.name_contains) < 0) {
                continue
            }
            count++
        }
        return count
    },

    /**
     * The application found at a participant's expected scope, or ''.
     *
     * The scope is predictable - `x_snc_` + prefix - so this needs no
     * configuration and answers the first thing a facilitator wants to know:
     * did they get the setup task done at all?
     */
    _appNameForScope: function (scope) {
        if (!scope) {
            return ''
        }
        var gr = new GlideRecord(LAB_T_SCOPE)
        gr.addQuery('scope', scope)
        gr.setLimit(1)
        gr.query()
        return gr.next() ? this._str(gr.getValue('name')) : ''
    },

    /* ------------------------------------------------------------ *
     * GET /facilitator/plans/{plan_id}/artifacts
     * ------------------------------------------------------------ */

    getArtifactEvidence: function (request, response) {
        if (!this.holdsAppRole(LAB_ROLE_FACILITATOR)) {
            this._send(response, 403, this._roleRefusal(LAB_ROLE_FACILITATOR))
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

        // Tasks of the plan, in reading order, with their expectations.
        var sectionIds = []
        var sg = new GlideRecordSecure(LAB_T_SECTION)
        sg.addQuery('evaluation_plan', planSysId)
        sg.query()
        while (sg.next()) {
            sectionIds.push(sg.getUniqueValue() + '')
        }

        var tasks = []
        var taskIds = []
        if (sectionIds.length) {
            var tg = new GlideRecordSecure(LAB_T_TASK)
            tg.addQuery('plan_section', 'IN', sectionIds.join(','))
            tg.orderBy('order')
            tg.orderBy('sys_created_on')
            tg.query()
            while (tg.next()) {
                var taskId = tg.getUniqueValue() + ''
                taskIds.push(taskId)
                tasks.push({ sys_id: taskId, title: this._str(tg.getValue('title')) })
            }
        }

        var expectationsByTask = this._expectationsByTask(taskIds)

        // Only the tables some expectation actually names.
        var tables = []
        var seenTable = {}
        var t
        for (t = 0; t < taskIds.length; t++) {
            var list = expectationsByTask[taskIds[t]] || []
            for (var e = 0; e < list.length; e++) {
                var table = list[e].target_table
                if (table && !seenTable[table]) {
                    seenTable[table] = true
                    tables.push(table)
                }
            }
        }
        for (t = 0; t < tasks.length; t++) {
            tasks[t].expectations = (expectationsByTask[tasks[t].sys_id] || []).length
        }

        // Participants, with the scope they were told to build in.
        var participants = []
        var userIds = []
        var pg = new GlideRecordSecure(LAB_T_PARTICIPANT)
        pg.addQuery('evaluation_plan', planSysId)
        pg.orderBy('participant_number')
        pg.query()
        while (pg.next()) {
            var userId = this._str(pg.getValue('user'))
            userIds.push(userId)
            participants.push({
                sys_id: pg.getUniqueValue() + '',
                user: userId,
                user_name: '',
                login: '',
                participant_number: this._toInt(pg.getValue('participant_number')),
                prefix: this._str(pg.getValue('prefix')),
                app_scope: this._str(pg.getValue('app_scope')),
                app_name: this._str(pg.getValue('app_name')),
                app_found: false,
                tasks_evidenced: 0,
                tasks_total: 0,
                by_task: {},
            })
        }

        var names = this._userNames(userIds)
        var logins = this._userLogins(userIds)
        var loginList = []
        var p
        for (p = 0; p < participants.length; p++) {
            participants[p].user_name = this._str(names[participants[p].user])
            participants[p].login = this._str(logins[participants[p].user])
            if (participants[p].login) {
                loginList.push(participants[p].login)
            }
        }

        var index = this._artifactIndex(loginList, tables)

        for (p = 0; p < participants.length; p++) {
            var row = participants[p]

            // The scope is derived from the prefix, so a row written before
            // app_scope existed still reports correctly.
            var scope = row.app_scope || (row.prefix ? 'x_snc_' + row.prefix : '')
            var appName = this._appNameForScope(scope)
            row.app_scope = scope
            row.app_name = appName
            row.app_found = !!appName

            for (t = 0; t < taskIds.length; t++) {
                var expectations = expectationsByTask[taskIds[t]] || []
                if (!expectations.length) {
                    continue
                }
                row.tasks_total++
                var met = 0
                for (var x = 0; x < expectations.length; x++) {
                    if (this._evidenceCount(index, row.login, expectations[x]) >= expectations[x].minimum) {
                        met++
                    }
                }
                row.by_task[taskIds[t]] =
                    met === expectations.length ? 'found' : met > 0 ? 'partial' : 'missing'
                if (met === expectations.length) {
                    row.tasks_evidenced++
                }
            }

            this._rememberApp(row.sys_id, scope, appName)
        }

        this._send(response, 200, {
            plan: { sys_id: planSysId, name: this._str(plan.getValue('name')) },
            tasks: tasks,
            participants: participants,
            scanned_on: this._now(),
        })
    },

    /**
     * Writes the scope and the application found at it back onto the row.
     *
     * Only when something changed, so a scan of a settled room writes nothing.
     * A refused write is swallowed: this is a read endpoint, and the answer it
     * returns is already correct without the row being updated.
     */
    _rememberApp: function (participantId, scope, appName) {
        var gr = new GlideRecordSecure(LAB_T_PARTICIPANT)
        if (!gr.get(participantId)) {
            return
        }
        if (this._str(gr.getValue('app_scope')) === scope && this._str(gr.getValue('app_name')) === appName) {
            return
        }
        gr.setValue('app_scope', scope)
        gr.setValue('app_name', appName)
        try {
            gr.update()
        } catch (e) {
            // Reporting is unaffected.
        }
    },

    /* ------------------------------------------------------------ *
     * GET /facilitator/plans/{plan_id}/summary
     * ------------------------------------------------------------ */

    getFacilitatorSummary: function (request, response) {
        if (!this.holdsAppRole(LAB_ROLE_FACILITATOR)) {
            this._send(response, 403, this._roleRefusal(LAB_ROLE_FACILITATOR))
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
        if (this.holdsAppRole(LAB_ROLE_AUTHOR)) {
            return true
        }
        this._send(response, 403, this._roleRefusal(LAB_ROLE_AUTHOR))
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
            /*
             * A reference field takes a sys_id, and a body can carry any
             * sys_id at all, so the value is checked against the same list the
             * picker is built from rather than trusted. Empty clears the field,
             * which is how a plan goes back to having no facilitator.
             */
            if (field === 'facilitator' && value && !this._isFacilitator(value)) {
                return { error: 'facilitator must be a user with the ' + LAB_ROLE_FACILITATOR + ' role' }
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

    /*
     * Reads below use plain `GlideRecord` and never dot-walk.
     *
     * `GlideRecord` because an author is not guaranteed any access to the user
     * and role tables, and because nothing read here reaches a caller beyond
     * the facilitator list itself. No dot-walking - `addQuery('role.name')`,
     * `has.user.getDisplayValue()` - because each one is a cross-scope join
     * that works on this instance only by virtue of a privilege row probing
     * created here, which the repo deliberately does not declare. Three plain
     * queries work anywhere the app is installed.
     */

    /** The sys_id of a role by name, or '' when no such role exists. */
    _roleId: function (name) {
        if (!this._roleIdCache) {
            this._roleIdCache = {}
        }
        if (Object.prototype.hasOwnProperty.call(this._roleIdCache, name)) {
            return this._roleIdCache[name]
        }
        var role = new GlideRecord(LAB_T_USER_ROLE)
        role.addQuery('name', name)
        role.setLimit(1)
        role.query()
        var id = role.next() ? role.getUniqueValue() + '' : ''
        this._roleIdCache[name] = id
        return id
    },

    /** True when a sys_id belongs to a user granted a role. */
    _userHasRole: function (userId, roleName) {
        var roleId = this._roleId(roleName)
        if (!userId || !roleId) {
            return false
        }
        /*
         * sys_user_has_role carries every grant: direct, through a group, and
         * inherited from a containing role. What it does NOT carry is the
         * admin role's blanket pass, which is the whole point of asking here.
         */
        var has = new GlideRecord(LAB_T_USER_HAS_ROLE)
        has.addQuery('user', userId)
        has.addQuery('role', roleId)
        has.setLimit(1)
        has.query()
        return has.next()
    },

    /** True when a sys_id belongs to a user holding the facilitator role. */
    _isFacilitator: function (userId) {
        return this._userHasRole(userId, LAB_ROLE_FACILITATOR)
    },

    /**
     * Whether the CALLER has actually been granted one of this app's roles.
     *
     * Deliberately not `gs.hasRole`, which answers true for an admin for every
     * role that exists. That made the app behave differently for the people
     * building it than for the people using it, and it hid two real bugs: the
     * participant number was read through an ACL only an admin could satisfy,
     * and the facilitator path had never once been exercised by a facilitator.
     *
     * An admin can still grant themselves the role - it is one record - and
     * then they are a facilitator in the same way everybody else is.
     */
    holdsAppRole: function (roleName) {
        if (!this._appRoleCache) {
            this._appRoleCache = {}
        }
        if (Object.prototype.hasOwnProperty.call(this._appRoleCache, roleName)) {
            return this._appRoleCache[roleName]
        }
        var held = this._userHasRole(gs.getUserID() + '', roleName)
        this._appRoleCache[roleName] = held
        return held
    },

    /** The 403 body for a missing app role, saying what to do about it. */
    _roleRefusal: function (roleName) {
        return {
            error:
                'Requires the ' +
                roleName +
                ' role. The admin role is not enough: this role has to be granted to your user.',
        }
    },

    /** One user's display name, through the same resolver the dashboard uses. */
    _userName: function (userId) {
        if (!userId) {
            return ''
        }
        return this._str(this._userNames([userId])[userId])
    },

    /* ------------------------------------------------------------ *
     * GET /authoring/facilitators
     *
     * The users a plan's facilitator may be set to: everyone holding
     * x_snc_holg.facilitator. An author needs this to fill the picker, and
     * nothing in it is sensitive - a name and a sys_id for a role the author
     * can already see on every plan.
     *
     * `GlideRecord` on sys_user_has_role, like the participant-number read and
     * for the same reason: an author is not guaranteed any access to the role
     * tables, and the result never leaves this list.
     * ------------------------------------------------------------ */
    getAuthoringFacilitators: function (request, response) {
        if (!this._authorGate(response)) {
            return
        }

        var roleId = this._facilitatorRoleId()
        if (!roleId) {
            this._send(response, 200, { facilitators: [] })
            return
        }

        var ids = []
        var seen = {}
        var has = new GlideRecord(LAB_T_USER_HAS_ROLE)
        has.addQuery('role', roleId)
        has.query()
        while (has.next()) {
            var id = this._str(has.getValue('user'))
            if (id && !seen[id]) {
                seen[id] = true
                ids.push(id)
            }
        }

        var people = []
        if (ids.length) {
            var user = new GlideRecord(LAB_T_USER)
            user.addQuery('sys_id', 'IN', ids.join(','))
            user.addQuery('active', true)
            user.orderBy('name')
            user.query()
            while (user.next()) {
                people.push({
                    sys_id: user.getUniqueValue() + '',
                    name: this._str(user.getValue('name')),
                    user_name: this._str(user.getValue('user_name')),
                })
            }
        }

        this._send(response, 200, { facilitators: people })
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
                facilitator: this._str(plan.getValue('facilitator')),
                facilitator_name: this._userName(this._str(plan.getValue('facilitator'))),
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
