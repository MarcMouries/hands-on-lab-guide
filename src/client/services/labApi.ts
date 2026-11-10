import { describe, requestLabJson } from './labHttp'

export interface LabMe {
    sys_id: string
    name: string
    isFacilitator: boolean
    isParticipant: boolean
    /** True when the EFFECTIVE user holds `admin`. Gates the Impersonate control. */
    isAdmin: boolean
    /** True when this session is impersonating someone. */
    isImpersonating: boolean
    /** The original (impersonating) user. Empty when not impersonating. */
    realUserId: string
    realUserName: string
}

/**
 * GET /api/x_snc_holg/lab/me
 *
 * Transport and envelope handling live in `labHttp`; the checks and messages
 * here are unchanged from the original implementation.
 */
export async function fetchMe(): Promise<LabMe> {
    const received = await requestLabJson('/api/x_snc_holg/lab/me', {
        notOkMessage: (status) => 'Could not load your lab profile (HTTP ' + status + ').',
        isBareShape: (candidate) => typeof candidate.name === 'string',
    })

    const body = received.body as Partial<LabMe>
    if (!body || typeof body.name !== 'string') {
        throw new Error('The lab API returned an unexpected response.' + describe(received.payload))
    }

    return {
        sys_id: typeof body.sys_id === 'string' ? body.sys_id : '',
        name: body.name,
        isFacilitator: body.isFacilitator === true,
        isParticipant: body.isParticipant === true,
        isAdmin: body.isAdmin === true,
        isImpersonating: body.isImpersonating === true,
        realUserId: typeof body.realUserId === 'string' ? body.realUserId : '',
        realUserName: typeof body.realUserName === 'string' ? body.realUserName : '',
    }
}
