import { SPPage } from '@servicenow/sdk/core'

SPPage({
    title: 'Plan Authoring',
    category: 'custom',
    pageId: 'authoring',
    shortDescription: 'Edit evaluation plans, sections, tasks, prompts and success criteria.',
    roles: ['x_snc_holg.author'],
    containers: [
        {
            $id: '628629121f36417eb0e057cee9382f09',
            order: 100,
            name: 'Authoring',
            rows: [
                {
                    $id: 'e1b6ba2025d24b2ab61beb58e2f03929',
                    order: 100,
                    columns: [
                        {
                            $id: '663122e3c04446e192ca979d8ac91e17',
                            order: 100,
                            instances: [
                                {
                                    $id: '1e216ce9f5f249938fa1a59dafcbbca3',
                                    title: 'Plan Authoring',
                                    widget: '26bffeced7be4aab8c348178e46283ff',
                                    widgetParameters:
                                        '{"page_name":{"value":"Plan Authoring","displayValue":"Plan Authoring"}}',
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
