import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['33690d1709e84ca693f2319edb826567'],
    name: 'HOLG Participant Shell',
    clientScript: Now.include('./sp_widget_x_snc_holg_participant_shell/client_script.js'),
    serverScript: Now.include('./sp_widget_x_snc_holg_participant_shell/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_x_snc_holg_participant_shell/template.html'),
    customCss: Now.include('./sp_widget_x_snc_holg_participant_shell/style.scss'),
    description: 'Thin AngularJS shell that mounts the participant React 18 app into #react-root.',
    id: 'x_snc_holg_participant_shell',
    linkScript: Now.include('./sp_widget_x_snc_holg_participant_shell/link-script.js'),
    optionSchema: [
        {
            name: 'page_name',
            label: 'Page Name',
            type: 'string',
            section: 'Presentation',
            defaultValue: 'Participant Lab',
        },
    ],
})
