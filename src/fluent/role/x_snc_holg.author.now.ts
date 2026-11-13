import { Role } from '@servicenow/sdk/core'

/*
 * Separate from x_snc_holg.facilitator on purpose: watching a workshop and
 * changing the plan it is running from are different jobs, and a facilitator
 * with both open should not be able to edit a plan mid-run by accident.
 * Gates the authoring portal page and the /authoring REST routes.
 */
Role({
    name: 'x_snc_holg.author',
    description: 'Authors evaluation plans, sections, tasks, prompts and success criteria in the portal authoring UI.',
})
