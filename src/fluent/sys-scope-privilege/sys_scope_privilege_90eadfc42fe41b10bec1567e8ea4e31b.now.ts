import { CrossScopePrivilege } from '@servicenow/sdk/core'

CrossScopePrivilege({
    $id: Now.ID['90eadfc42fe41b10bec1567e8ea4e31b'],
    operation: 'read',
    status: 'allowed',
    targetName: 'sys_security_acl_role',
    targetScope: 'global',
    targetType: 'sys_db_object',
})
