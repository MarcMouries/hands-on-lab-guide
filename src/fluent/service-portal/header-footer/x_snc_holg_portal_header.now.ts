import { SPHeaderFooter } from '@servicenow/sdk/core'

SPHeaderFooter({
    $id: Now.ID['2acb2ce7c0814fba803d007946da2c9f'],
    name: 'HOLG Portal Header',
    clientScript: Now.include('./sp_header_footer_x_snc_holg_portal_header/client_script.js'),
    serverScript: Now.include('./sp_header_footer_x_snc_holg_portal_header/server_script.js'),
    htmlTemplate: Now.include('./sp_header_footer_x_snc_holg_portal_header/template.html'),
    customCss: Now.include('./sp_header_footer_x_snc_holg_portal_header/style.scss'),
    description:
        'ServiceNow-branded sticky header for the Hands-On Lab Guide portal: wordmark, app title, "Built with App Engine" label.',
    id: 'x_snc_holg_portal_header',
    linkScript: Now.include('./sp_header_footer_x_snc_holg_portal_header/link-script.js'),
    public: true,
})
