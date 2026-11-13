import React from 'react'
import ReactDOM from 'react-dom/client'
import './components/brand.css'
import './components/ParticipantLab.css'
import { ImpersonationBar } from './components/ImpersonationBar'
import { PlansView } from './components/PlansView'
import { PlanView } from './components/PlanView'
import { mountLabApp } from './utils/mountRoot'
import { PLAN_PARAM, readUrlParam } from './utils/navigate'

mountLabApp((mount) => {
    /*
     * Routing is driven by the presence of `plan`, not by `id`, so the same
     * bundle works on the Service Portal pages (?id=plans / ?id=plan) and on
     * the standalone x_snc_holg_participant.do page, which has no `id` param.
     *
     * Read through readUrlParam rather than off the context directly, so a
     * link still carrying the older `plan_id` opens the plan it names.
     */
    const planId = readUrlParam(PLAN_PARAM)

    ReactDOM.createRoot(mount).render(
        <>
            {/* Renders nothing unless this session is impersonating. */}
            <ImpersonationBar />
            {planId ? <PlanView planId={planId} /> : <PlansView />}
        </>,
    )
})
