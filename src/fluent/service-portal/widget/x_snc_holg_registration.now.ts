import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['2f066dd66ce94006a9a4d220556867a1'],
    name: 'HOLG Registration',
    clientScript: Now.include('./sp_widget_x_snc_holg_registration/client_script.js'),
    serverScript: Now.include('./sp_widget_x_snc_holg_registration/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_x_snc_holg_registration/template.html'),
    customCss: Now.include('./sp_widget_x_snc_holg_registration/style.scss'),
    description:
        'Public self-registration for a lab event. Creates an account for a visitor with no session, or enrols a signed-in user without touching their password.',
    id: 'x_snc_holg_registration',
    // The only part of this application reachable without signing in.
    public: true,
    optionSchema: [
        {
            name: 'event_slug',
            label: 'Event',
            type: 'string',
            section: 'Presentation',
            hint: 'Fallback when the URL carries no ?event= parameter.',
        },
    ],
})
