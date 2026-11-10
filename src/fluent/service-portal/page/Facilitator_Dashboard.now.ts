import { SPPage } from '@servicenow/sdk/core'

SPPage({
    title: 'Facilitator Dashboard',
    category: 'custom',
    pageId: 'facilitator',
    shortDescription: 'Facilitator dashboard for the Hands-On Lab Guide.',
    roles: ['x_snc_holg.facilitator'],
    containers: [
        {
            $id: '46af8eb604b04dd4ac0dec12a4c7eaa2',
            order: 100,
            name: 'Facilitator',
            rows: [
                {
                    $id: 'f19d3555c8e0430c8cec395c839f17b7',
                    order: 100,
                    columns: [
                        {
                            $id: '10bf6105febe4f15acddcb3ef789f885',
                            order: 100,
                            instances: [
                                {
                                    $id: 'ce8b618642894daf96a29d56db1e2329',
                                    title: 'Facilitator Dashboard',
                                    widget: '1206c47acbac404baf7a0d444b3fbf11',
                                    widgetParameters:
                                        '{"page_name":{"value":"Facilitator Dashboard","displayValue":"Facilitator Dashboard"}}',
                                    order: 100,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
})
