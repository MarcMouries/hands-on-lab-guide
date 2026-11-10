import { SPPage } from '@servicenow/sdk/core'

SPPage({
    title: 'Lab Plan',
    category: 'custom',
    pageId: 'plan',
    shortDescription: 'Participant task view for a single lab plan.',
    roles: ['x_snc_holg.participant'],
    containers: [
        {
            $id: '0ce78e83db38416eb89c8fbf6bd1d5bf',
            order: 100,
            name: 'Plan',
            rows: [
                {
                    $id: '7d15bf8bb1cb4aeda5de8f71211b1a9f',
                    order: 100,
                    columns: [
                        {
                            $id: 'f6400746adbb405d9228761214942995',
                            order: 100,
                            instances: [
                                {
                                    $id: '2ab4848feee84103be792031a9275db0',
                                    title: 'Lab Plan',
                                    widget: '33690d1709e84ca693f2319edb826567',
                                    widgetParameters: '{"page_name":{"value":"Lab Plan","displayValue":"Lab Plan"}}',
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
