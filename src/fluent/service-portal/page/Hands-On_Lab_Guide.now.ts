import { SPPage } from '@servicenow/sdk/core'

SPPage({
    title: 'Hands-On Lab Guide',
    category: 'custom',
    pageId: 'home',
    shortDescription: 'Role-based landing page for the Hands-On Lab Guide portal.',
    containers: [
        {
            $id: '01eb7d8789834f48a8034af3c9092c17',
            order: 100,
            name: 'Home',
            rows: [
                {
                    $id: 'd30a3dc1fe8d4d88adc3df1730f45690',
                    order: 100,
                    columns: [
                        {
                            $id: '89f9b81cb8b343b9ba14313a23f22fdb',
                            order: 100,
                            instances: [
                                {
                                    $id: '57637a83801342e38662733efa5a0412',
                                    title: 'Lab access',
                                    widget: 'a1db1c3a9fa2446296976d141be1f6cf',
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
