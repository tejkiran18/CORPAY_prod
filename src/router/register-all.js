// Central registration point — imports every module's route definitions.
const { registerModule } = require('./v1')

let registered = false

function registerAll() {
  if (registered) return
  registered = true
  registerModule(require('../modules/admin/admin.routes'))
  registerModule(require('../modules/identity/identity.routes'))
  registerModule(require('../modules/organization/organization.routes'))
  registerModule(require('../modules/employee/employee.routes'))
  registerModule(require('../modules/project/project.routes'))
  registerModule(require('../modules/business-event/business-event.routes'))
  registerModule(require('../modules/merchant/merchant.routes'))
  registerModule(require('../modules/policy-engine/policy.routes'))
  registerModule(require('../modules/spending-rights/spending-rights.routes'))
  registerModule(require('../modules/budget/budget.routes'))
  registerModule(require('../modules/transaction/transaction.routes'))
  registerModule(require('../modules/approval/approval.routes'))
  registerModule(require('../modules/analytics/analytics.routes'))
  registerModule(require('../modules/ai/ai.routes'))
  registerModule(require('../modules/audit/audit.routes'))
}

module.exports = { registerAll }
