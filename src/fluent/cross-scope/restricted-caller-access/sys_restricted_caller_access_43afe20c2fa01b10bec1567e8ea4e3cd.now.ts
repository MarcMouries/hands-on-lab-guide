import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['43afe20c2fa01b10bec1567e8ea4e3cd'],
    table: 'sys_restricted_caller_access',
    data: {
        operation: 'read',
        rca_type: 'real_rca',
        source: 'bfc5926378144c9a8a8a18bf26a03f5e',
        source_scope: '6805ff49c0eb46ee969d42f0dd56b3bf',
        source_table: 'sys_ws_operation',
        source_type: '22',
        status: '2',
        target: '5bea3c51d8c14a388a3ab9012d433c8d',
        target_scope: 'f989de442f201b10bec1567e8ea4e3a7',
        target_table: 'sys_db_object',
        target_type: '1',
    },
})
