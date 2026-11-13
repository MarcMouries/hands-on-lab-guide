import { ScheduledScript } from '@servicenow/sdk/core'

/*
 * Grants the platform roles a public registration could not.
 *
 * No `runAs`: a Scheduled Script Execution with nobody named runs as the system
 * user, and that is exactly what this needs. A registrant is a guest, and a
 * guest cannot grant `admin` - the role belongs to Global, so the insert is a
 * cross-scope write and the platform refuses it for any caller who is not an
 * admin. Naming a person here instead would tie the whole mechanism to one
 * account staying active and keeping its roles.
 *
 * Every minute, because this is the gap between someone reading their password
 * off the screen and needing the access. The work is idempotent and bounded, so
 * a run with nothing to do is a couple of queries and no writes.
 */
ScheduledScript({
    $id: Now.ID['5b09efb297ca45859ded500da8a1f0f8'],
    name: 'HOLG finish lab registrations',
    active: true,
    frequency: 'periodically',
    executionInterval: { minutes: 1 },
    script: Now.include('./finish_registrations.js'),
})
