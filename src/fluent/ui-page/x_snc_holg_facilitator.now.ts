import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import htmlFile from '../../client/facilitator.html'

UiPage({
    $id: Now.ID['a0fd7949c6dc4910b9fcc5c5901655f0'],
    endpoint: 'x_snc_holg_facilitator.do',
    description: 'Standalone React 18 facilitator dashboard for the Hands-On Lab Guide.',
    category: 'general',
    direct: true,
    html: htmlFile,
    clientScript: '',
    processingScript: '',
})
