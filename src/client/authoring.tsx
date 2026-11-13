import React from 'react'
import ReactDOM from 'react-dom/client'
import './components/brand.css'
/*
 * ParticipantLab.css comes along deliberately: the Markdown preview is the
 * participant's own renderer, so it needs the participant's own styles to show
 * what the step will actually look like. PromptBox.css arrives with the
 * PromptMarkdown import.
 */
import './components/ParticipantLab.css'
import AuthoringApp from './components/AuthoringApp'
import { ImpersonationBar } from './components/ImpersonationBar'
import { mountLabApp } from './utils/mountRoot'

mountLabApp((mount) => {
    ReactDOM.createRoot(mount).render(
        <>
            {/* Renders nothing unless this session is impersonating. */}
            <ImpersonationBar />
            <AuthoringApp />
        </>,
    )
})
