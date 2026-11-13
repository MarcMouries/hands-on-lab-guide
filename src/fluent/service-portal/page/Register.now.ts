import { SPPage } from '@servicenow/sdk/core'

/*
 * The one page in this application that opens without signing in.
 *
 * `roles` is deliberately empty and `public` is true: a visitor arriving from
 * an invitation has no account yet, which is the whole point. Everything that
 * decides whether they may register is on the Lab Event record and is checked
 * by the widget's server script - this page grants nothing by existing.
 */
SPPage({
    title: 'Register for a lab',
    category: 'custom',
    pageId: 'register',
    shortDescription: 'Public self-registration for a lab event.',
    public: true,
    roles: [],
    containers: [
        {
            $id: '1bcf4096ebf84ae2a2e2a8a2898a7e6d',
            order: 100,
            name: 'Registration',
            rows: [
                {
                    $id: '03bba929cbfe4c7485ecaecd38cd18dc',
                    order: 100,
                    columns: [
                        {
                            $id: '872fb3bf83b3476e8920881633084e78',
                            order: 100,
                            instances: [
                                {
                                    $id: '783d015dc53a4196b4376f5b3af4ca11',
                                    title: 'Registration',
                                    widget: '2f066dd66ce94006a9a4d220556867a1',
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
