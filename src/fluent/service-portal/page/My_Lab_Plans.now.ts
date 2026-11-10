import { SPPage } from '@servicenow/sdk/core'

SPPage({
    title: 'My Lab Plans',
    category: 'custom',
    pageId: 'plans',
    shortDescription: 'Participant lab plan list.',
    roles: ['x_snc_holg.participant'],
    containers: [
        {
            $id: 'b210cbab2f8349289ebc46f9c4633666',
            order: 100,
            name: 'Plans',
            rows: [
                {
                    $id: '2d59d70971e5469fb46a527dc6101ba6',
                    order: 100,
                    columns: [
                        {
                            $id: 'be1a51e156194512b5a8381597a4651e',
                            order: 100,
                            instances: [
                                {
                                    $id: '57e4ff25b87b4cee810a0b965241a41a',
                                    title: 'My Lab Plans',
                                    widget: '33690d1709e84ca693f2319edb826567',
                                    widgetParameters:
                                        '{"page_name":{"value":"My Lab Plans","displayValue":"My Lab Plans"}}',
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
