import { PlanParticipant } from '../services/participantApi'

/**
 * Values that step content can reference as `{{token}}`.
 *
 * The workshop runs dozens of participants on one instance, so almost every
 * instruction has to name something specific to the reader - their number,
 * their prefix, the scope they build in. Keeping those as tokens means one
 * authored prompt serves everyone.
 */
export type PromptTokens = Record<string, string>

/** Shown instead of a value when enrolment has not assigned a number yet. */
const UNASSIGNED = 'not assigned yet'

/**
 * The instance the reader is already on, so step content never has to name it.
 *
 * Taken from the page rather than from a property: whoever opens the lab on a
 * different instance - a rerun, a clone, a PDI - gets their own URL with no
 * content edit. `origin` and not `href`, so none of this view's own params
 * ride along into an instruction.
 */
function instanceUrl(): string {
    return (window.location && window.location.origin) || ''
}

export function promptTokensFor(participant: PlanParticipant | null): PromptTokens {
    const number = participant ? participant.participant_number : 0
    const prefix = (participant && participant.prefix) || ''

    if (!number || !prefix) {
        return {
            user_name: (participant && participant.user_display_name) || 'this user',
            participant_number: UNASSIGNED,
            prefix: UNASSIGNED,
            scope: UNASSIGNED,
            app_name: UNASSIGNED,
            instance_url: instanceUrl(),
        }
    }

    return {
        user_name: participant ? participant.user_display_name : '',
        participant_number: String(number),
        prefix: prefix,
        // 18 characters is the hard cap on sys_scope.scope, and `x_snc_`
        // spends 6 of them, so the prefix has to stay short.
        scope: 'x_snc_' + prefix,
        app_name: 'Now Assist Lab ' + prefix,
        // Not derived from the participant: the instance is the same for all of
        // them, and the URL is right even before enrolment assigns a number.
        instance_url: instanceUrl(),
    }
}

/**
 * Fills `{{token}}` placeholders in prompt source text.
 *
 * This runs on the Markdown SOURCE, before it is rendered and before the Copy
 * button reads it, so Copy still hands over Markdown rather than rendered
 * text - just with this participant's values in place of the placeholders.
 *
 * An unknown token is left exactly as written, so a typo in authored content
 * surfaces as `{{wahtever}}` on the page instead of vanishing silently.
 */
export function substituteTokens(text: string, tokens: PromptTokens): string {
    if (!text || text.indexOf('{{') < 0) {
        return text
    }
    return text.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (whole, key: string) => {
        const value = tokens[key.toLowerCase()]
        return value === undefined ? whole : value
    })
}
