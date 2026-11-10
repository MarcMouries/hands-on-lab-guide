import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import htmlFile from '../../client/participant.html'

UiPage({
    $id: Now.ID['6848c3387db8499cb91ea84a15d000dd'],
    endpoint: 'x_snc_holg_participant.do',
    description: 'Standalone React 18 participant lab view for the Hands-On Lab Guide.',
    category: 'general',
    direct: true,
    html: htmlFile,
    clientScript: '',
    processingScript: '',
})
