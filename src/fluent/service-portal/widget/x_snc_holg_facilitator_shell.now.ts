import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['1206c47acbac404baf7a0d444b3fbf11'],
    name: 'HOLG Facilitator Shell',
    clientScript: Now.include('./sp_widget_x_snc_holg_facilitator_shell/client_script.js'),
    serverScript: Now.include('./sp_widget_x_snc_holg_facilitator_shell/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_x_snc_holg_facilitator_shell/template.html'),
    description: 'Thin AngularJS shell that mounts the facilitator React 18 app into #react-root.',
    id: 'x_snc_holg_facilitator_shell',
    linkScript: Now.include('./sp_widget_x_snc_holg_facilitator_shell/link-script.js'),
    optionSchema: [
        {
            name: 'page_name',
            label: 'Page Name',
            type: 'string',
            section: 'Presentation',
            defaultValue: 'Facilitator Dashboard',
        },
    ],
})
