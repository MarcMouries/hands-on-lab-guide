import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['a1db1c3a9fa2446296976d141be1f6cf'],
    name: 'HOLG Home Access Message',
    clientScript: Now.include('./sp_widget_x_snc_holg_home_gate/client_script.js'),
    serverScript: Now.include('./sp_widget_x_snc_holg_home_gate/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_x_snc_holg_home_gate/template.html'),
    description: 'Routes participants to their plan list and shows the no-access message to everyone else.',
    id: 'x_snc_holg_home_gate',
    linkScript: Now.include('./sp_widget_x_snc_holg_home_gate/link-script.js'),
})
