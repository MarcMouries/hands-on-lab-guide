import React from 'react'
import ReactDOM from 'react-dom/client'
import './components/brand.css'
import './components/ParticipantLab.css'
import { ImpersonationBar } from './components/ImpersonationBar'
import { PlansView } from './components/PlansView'
import { PlanView } from './components/PlanView'
import { readLabPageContext } from './utils/context'

const mount = document.getElementById('react-root')
if (mount) {
    const context = readLabPageContext(mount)

    /*
     * Routing is driven by the presence of `plan_id`, not by `id`, so the same
     * bundle works on the Service Portal pages (?id=plans / ?id=plan) and on
     * the standalone x_snc_holg_participant.do page, which has no `id` param.
     */
    const planId = context.params.plan_id || ''

    ReactDOM.createRoot(mount).render(
        <>
            {/* Renders nothing unless this session is impersonating. */}
            <ImpersonationBar />
            {planId ? <PlanView planId={planId} /> : <PlansView />}
        </>,
    )
}
