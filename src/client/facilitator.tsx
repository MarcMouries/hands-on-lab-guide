import React from 'react'
import ReactDOM from 'react-dom/client'
import './components/brand.css'
import FacilitatorDashboard from './components/FacilitatorDashboard'
import { ImpersonationBar } from './components/ImpersonationBar'
import { readLabPageContext } from './utils/context'

const mount = document.getElementById('react-root')
if (mount) {
    const context = readLabPageContext(mount)
    ReactDOM.createRoot(mount).render(
        <>
            {/* Renders nothing unless this session is impersonating. */}
            <ImpersonationBar />
            <FacilitatorDashboard pageName={context.page} params={context.params} />
        </>,
    )
}
