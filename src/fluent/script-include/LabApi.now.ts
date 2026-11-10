import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['060b9bd91e4642ea9e66146df4f20fb4'],
    name: 'LabApi',
    script: Now.include('../generated/server-development/script-include/sys_script_include_060b9bd91e4642ea9e66146df4f20fb4.server.js'),
    description:
        'Server logic behind the Lab Scripted REST API. All table access uses GlideRecordSecure so the application ACLs are enforced.',
    apiName: 'x_snc_holg.LabApi',
    clientCallable: false,
    mobileCallable: false,
    active: true,
})
