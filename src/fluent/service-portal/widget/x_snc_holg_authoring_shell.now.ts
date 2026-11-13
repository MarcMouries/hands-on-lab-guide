import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['26bffeced7be4aab8c348178e46283ff'],
    name: 'HOLG Authoring Shell',
    clientScript: Now.include('./sp_widget_x_snc_holg_authoring_shell/client_script.js'),
    serverScript: Now.include('./sp_widget_x_snc_holg_authoring_shell/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_x_snc_holg_authoring_shell/template.html'),
    description: 'Thin AngularJS shell that mounts the plan authoring React app into #react-root.',
    id: 'x_snc_holg_authoring_shell',
    linkScript: Now.include('./sp_widget_x_snc_holg_authoring_shell/link-script.js'),
    optionSchema: [
        {
            name: 'page_name',
            label: 'Page Name',
            type: 'string',
            section: 'Presentation',
            defaultValue: 'Plan Authoring',
        },
    ],
})
