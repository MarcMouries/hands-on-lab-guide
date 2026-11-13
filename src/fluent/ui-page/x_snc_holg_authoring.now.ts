import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import htmlFile from '../../client/authoring.html'

UiPage({
    $id: Now.ID['a86da023b30248018106603f4dc6c171'],
    endpoint: 'x_snc_holg_authoring.do',
    description: 'Standalone React plan authoring UI for the Hands-On Lab Guide.',
    category: 'general',
    direct: true,
    html: htmlFile,
    clientScript: '',
    processingScript: '',
})
