// Deterministic seed producing the EPPS Infotech demo tenant.
// Idempotent via delete-in-fk-order then insert. Safe to run any time.
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const PERMS = [
  // Format: [module, code, description]
  ['ORG',        'ORG:READ',          'Read organization'],
  ['ORG',        'ORG:WRITE',         'Modify organization'],
  ['EMPLOYEE',   'EMPLOYEE:READ',     'List employees'],
  ['EMPLOYEE',   'EMPLOYEE:WRITE',    'Create/update employees'],
  ['BUDGET',     'BUDGET:READ',       'Read budgets'],
  ['BUDGET',     'BUDGET:CREATE',     'Create budgets'],
  ['BUDGET',     'BUDGET:UPDATE',     'Update budgets'],
  ['BUDGET',     'BUDGET:DELETE',     'Delete budgets'],
  ['POLICY',     'POLICY:READ',       'Read policies'],
  ['POLICY',     'POLICY:WRITE',      'Modify policies'],
  ['SPEND_RIGHT','SPEND_RIGHT:READ',  'Read spending rights'],
  ['SPEND_RIGHT','SPEND_RIGHT:WRITE', 'Modify spending rights'],
  ['TXN',        'TXN:READ',          'Read transactions'],
  ['TXN',        'TXN:PAY',           'Initiate payments'],
  ['APPROVAL',   'APPROVAL:READ',     'Read approvals'],
  ['APPROVAL',   'APPROVAL:ACT',      'Approve/reject'],
  ['ANALYTICS',  'ANALYTICS:READ',    'View analytics'],
  ['AUDIT',      'AUDIT:READ',        'Read audit log'],
  ['AI',         'AI:USE',            'Use AI features'],
  ['ADMIN',      'ADMIN:SEED',        'Seed / reset demo'],
]

const ROLES_MAP = {
  'Super Admin':         PERMS.map(p => p[1]),
  'Finance Head':        ['ORG:READ','EMPLOYEE:READ','BUDGET:READ','BUDGET:CREATE','BUDGET:UPDATE','BUDGET:DELETE','POLICY:READ','POLICY:WRITE','SPEND_RIGHT:READ','SPEND_RIGHT:WRITE','TXN:READ','APPROVAL:READ','APPROVAL:ACT','ANALYTICS:READ','AUDIT:READ','AI:USE'],
  'Finance Executive':   ['ORG:READ','EMPLOYEE:READ','BUDGET:READ','BUDGET:CREATE','POLICY:READ','SPEND_RIGHT:READ','TXN:READ','APPROVAL:READ','ANALYTICS:READ','AI:USE'],
  'Department Manager':  ['ORG:READ','EMPLOYEE:READ','BUDGET:READ','SPEND_RIGHT:READ','TXN:READ','APPROVAL:READ','APPROVAL:ACT','ANALYTICS:READ','AI:USE'],
  'Employee':            ['ORG:READ','TXN:READ','TXN:PAY','SPEND_RIGHT:READ','AI:USE'],
}

async function seed({ withHistory = true } = {}) {
  // Delete in reverse-FK order
  const wipeOrder = [
    'auditLog','notification','attachment','riskEvent',
    'approvalHistory','approval','approvalStep','approvalWorkflow',
    'transaction','spendingRightCategory','spendingRight',
    'budget','budgetCategory',
    'policyRule','policy',
    'trip','businessEvent',
    'merchant','merchantCategory','transactionCategory',
    'managerAssignment','session','employee',
    'costCenter','department','businessUnit','project','projectType',
    'setting','rolePermission','employeeRole','employeeGrade','permission',
    'organization','city','country','currency',
  ]
  for (const m of wipeOrder) { try { await prisma[m].deleteMany({}) } catch {} }

  // Reference
  await prisma.currency.createMany({ data: [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
    { code: 'USD', name: 'US Dollar',    symbol: '$',  decimals: 2 },
    { code: 'EUR', name: 'Euro',         symbol: '€',  decimals: 2 },
  ] })
  const india = await prisma.country.create({ data: { code: 'IN', name: 'India',         currencyCode: 'INR' } })
  const usa   = await prisma.country.create({ data: { code: 'US', name: 'United States', currencyCode: 'USD' } })
  const cityHyd  = await prisma.city.create({ data: { countryId: india.id, name: 'Hyderabad',  state: 'Telangana' } })
  const cityBLR  = await prisma.city.create({ data: { countryId: india.id, name: 'Bengaluru',  state: 'Karnataka' } })
  const cityVSK  = await prisma.city.create({ data: { countryId: india.id, name: 'Visakhapatnam', state: 'AP' } })

  // Permissions & Roles
  for (const [module, code, description] of PERMS) {
    await prisma.permission.create({ data: { module, code, description } })
  }
  const permByCode = Object.fromEntries((await prisma.permission.findMany()).map(p => [p.code, p]))
  const roleByName = {}
  for (const [name, codes] of Object.entries(ROLES_MAP)) {
    const r = await prisma.employeeRole.create({ data: { name, isSystem: true, description: `Default ${name} role` } })
    for (const c of codes) await prisma.rolePermission.create({ data: { roleId: r.id, permissionId: permByCode[c].id } })
    roleByName[name] = r
  }
  const grades = await Promise.all([
    prisma.employeeGrade.create({ data: { name: 'L1', level: 1 } }),
    prisma.employeeGrade.create({ data: { name: 'L2', level: 2 } }),
    prisma.employeeGrade.create({ data: { name: 'L3', level: 3 } }),
    prisma.employeeGrade.create({ data: { name: 'M1', level: 4 } }),
    prisma.employeeGrade.create({ data: { name: 'M2', level: 5 } }),
  ])

  // Organization
  const org = await prisma.organization.create({ data: {
    legalName: 'EPPS Infotech Pvt Ltd', displayName: 'EPPS Infotech',
    gstin: '36AABCE1234F1Z5', currencyCode: 'INR', countryId: india.id,
    address: 'Hyderabad, Telangana, India',
  }})

  // BU / Departments / Cost Centers
  const bu = await prisma.businessUnit.create({ data: { organizationId: org.id, name: 'India Operations', code: 'BU-IN' } })
  const deptFin = await prisma.department.create({ data: { organizationId: org.id, businessUnitId: bu.id, name: 'Finance' } })
  const deptOps = await prisma.department.create({ data: { organizationId: org.id, businessUnitId: bu.id, name: 'Operations' } })
  const deptPrj = await prisma.department.create({ data: { organizationId: org.id, businessUnitId: bu.id, name: 'Projects' } })
  const ccFin = await prisma.costCenter.create({ data: { organizationId: org.id, departmentId: deptFin.id, code: 'CC-FIN-001', name: 'Finance HQ', budgetCeiling: 500000 } })
  const ccOps = await prisma.costCenter.create({ data: { organizationId: org.id, departmentId: deptOps.id, code: 'CC-OPS-001', name: 'Operations HQ', budgetCeiling: 800000 } })
  const ccPrj = await prisma.costCenter.create({ data: { organizationId: org.id, departmentId: deptPrj.id, code: 'CC-PRJ-001', name: 'Projects HQ', budgetCeiling: 1500000 } })

  // Project types & Projects
  const ptErp = await prisma.projectType.create({ data: { name: 'ERP Implementation', description: 'End-to-end ERP delivery' } })
  const ptCons = await prisma.projectType.create({ data: { name: 'Consulting', description: 'Advisory engagements' } })
  const projNDV = await prisma.project.create({ data: { organizationId: org.id, typeId: ptErp.id, code: 'NDV-001', name: 'NDV ERP',  client: 'NDV Industries',  status: 'ACTIVE', budgetCap: 1500000, startDate: new Date('2025-05-01'), endDate: new Date('2025-09-30') } })
  const projYard = await prisma.project.create({ data: { organizationId: org.id, typeId: ptErp.id, code: 'YARD-002', name: 'Yard ERP', client: 'Yard Logistics', status: 'ACTIVE', budgetCap: 900000, startDate: new Date('2025-05-15'), endDate: new Date('2025-10-15') } })

  // Employees
  const passwordHash = await bcrypt.hash('corpay123', 10)
  const mkEmp = (data) => prisma.employee.create({ data: { organizationId: org.id, passwordHash, ...data } })
  const anika = await mkEmp({ employeeCode: 'EPPS-0001', name: 'Anika Reddy',   email: 'anika@eppsinfotech.com',  phone: '+91 98765 11122', designation: 'Finance Manager',  gradeId: grades[4].id, roleId: roleByName['Finance Head'].id,       departmentId: deptFin.id })
  const priya = await mkEmp({ employeeCode: 'EPPS-0002', name: 'Priya Nair',    email: 'priya@eppsinfotech.com',  phone: '+91 98765 33344', designation: 'Finance Executive',gradeId: grades[2].id, roleId: roleByName['Finance Executive'].id,  departmentId: deptFin.id })
  const rohit = await mkEmp({ employeeCode: 'EPPS-0003', name: 'Rohit Sharma',  email: 'rohit@eppsinfotech.com',  phone: '+91 98765 22233', designation: 'Project Manager',   gradeId: grades[3].id, roleId: roleByName['Department Manager'].id, departmentId: deptPrj.id, projectId: projYard.id })
  const tej   = await mkEmp({ employeeCode: 'EPPS-0004', name: 'Tej Kiran',      email: 'tej@eppsinfotech.com',    phone: '+91 98765 43210', designation: 'Senior Engineer',   gradeId: grades[2].id, roleId: roleByName['Employee'].id,           departmentId: deptOps.id, projectId: projNDV.id })
  const vikram = await mkEmp({ employeeCode: 'EPPS-0005', name: 'Vikram Singh',  email: 'vikram@eppsinfotech.com', phone: '+91 98765 55566', designation: 'Field Engineer',    gradeId: grades[1].id, roleId: roleByName['Employee'].id,           departmentId: deptOps.id, projectId: projYard.id })

  // Manager assignments
  await prisma.managerAssignment.createMany({ data: [
    { managerId: rohit.id,  subordinateId: tej.id,    primary: true },
    { managerId: rohit.id,  subordinateId: vikram.id, primary: true },
    { managerId: anika.id,  subordinateId: priya.id,  primary: true },
  ] })
  // Backfill BU/Dept heads
  await prisma.businessUnit.update({ where: { id: bu.id }, data: { headEmployeeId: anika.id } })
  await prisma.department.update({ where: { id: deptFin.id }, data: { headEmployeeId: anika.id } })
  await prisma.department.update({ where: { id: deptOps.id }, data: { headEmployeeId: tej.id } })
  await prisma.department.update({ where: { id: deptPrj.id }, data: { headEmployeeId: rohit.id } })

  // Transaction Categories
  const catByName = {}
  for (const name of ['Food & Dining','Hotel & Stay','Travel','Fuel','Office Supplies','Client Meeting','Entertainment','Alcohol','Personal Shopping']) {
    catByName[name] = await prisma.transactionCategory.create({ data: { organizationId: org.id, name } })
  }

  // Merchant categories & merchants
  const mcHotel = await prisma.merchantCategory.create({ data: { mcc: '7011', name: 'Hotels', isRestrictedDefault: false } })
  const mcFood  = await prisma.merchantCategory.create({ data: { mcc: '5812', name: 'Restaurants', isRestrictedDefault: false } })
  const mcCab   = await prisma.merchantCategory.create({ data: { mcc: '4121', name: 'Taxi/Ride-share', isRestrictedDefault: false } })
  const mcFuel  = await prisma.merchantCategory.create({ data: { mcc: '5541', name: 'Fuel Stations', isRestrictedDefault: false } })
  const mcEnter = await prisma.merchantCategory.create({ data: { mcc: '5813', name: 'Bars & Nightclubs', isRestrictedDefault: true } })
  const mcGrocery = await prisma.merchantCategory.create({ data: { mcc: '5411', name: 'Grocery Stores', isRestrictedDefault: false } })
  const merch = {}
  const mkMerch = async (name, cat, upi, city) => (merch[name] = await prisma.merchant.create({ data: { name, mcc: cat.mcc, categoryId: cat.id, upiId: upi, cityId: city?.id, verified: true } }))
  await mkMerch('Taj Krishna Hyderabad', mcHotel, 'tajkrishna@upi', cityHyd)
  await mkMerch('Paradise Biryani',      mcFood,  'paradise@upi',   cityHyd)
  await mkMerch('Ola Cabs',              mcCab,   'ola@upi',        cityHyd)
  await mkMerch('Uber India',            mcCab,   'uber@upi',       cityHyd)
  await mkMerch('IndianOil Petrol',      mcFuel,  'iocl@upi',       cityHyd)
  await mkMerch('OYO Rooms Vizag',       mcHotel, 'oyovsk@upi',     cityVSK)
  await mkMerch('Reliance Smart',        mcGrocery, 'ril@upi',      cityHyd)
  await mkMerch('Hard Rock Cafe',        mcEnter, 'hrcafe@upi',     cityBLR)
  await mkMerch('ITC Kakatiya',          mcHotel, 'itckak@upi',     cityHyd)
  await mkMerch('Cafe Coffee Day',       mcFood,  'ccd@upi',        cityHyd)

  // Policy + rules (data-driven)
  const policy = await prisma.policy.create({ data: {
    organizationId: org.id, name: 'Default Spending Policy', isDefault: true, active: true,
    description: 'Company-wide default policy applied to every transaction.',
  } })
  const R = (data) => prisma.policyRule.create({ data: { policyId: policy.id, ...data } })
  await R({ ruleType: 'PER_TRANSACTION_LIMIT', field: 'amount', operator: 'LTE', valueNumeric: 10000, actionOnViolation: 'BLOCK',            connector: 'AND', sortOrder: 10, message: 'Exceeds per-transaction cap of ₹10000' })
  await R({ ruleType: 'CATEGORY_LIMIT',        field: 'Food & Dining', operator: 'LTE', valueNumeric: 1500,  actionOnViolation: 'REQUIRE_APPROVAL', connector: 'AND', sortOrder: 20, message: 'Food & Dining above ₹1500 needs approval' })
  await R({ ruleType: 'CATEGORY_LIMIT',        field: 'Hotel & Stay',  operator: 'LTE', valueNumeric: 5000,  actionOnViolation: 'REQUIRE_APPROVAL', connector: 'AND', sortOrder: 21, message: 'Hotel above ₹5000 needs approval' })
  await R({ ruleType: 'CATEGORY_LIMIT',        field: 'Travel',        operator: 'LTE', valueNumeric: 4000,  actionOnViolation: 'REQUIRE_APPROVAL', connector: 'AND', sortOrder: 22, message: 'Travel above ₹4000 needs approval' })
  await R({ ruleType: 'DAILY_LIMIT',           field: 'amount', operator: 'LTE', valueNumeric: 8000,  actionOnViolation: 'REQUIRE_APPROVAL', connector: 'AND', sortOrder: 30, message: 'Exceeds daily total of ₹8000' })
  await R({ ruleType: 'APPROVAL_THRESHOLD',    field: 'amount', operator: 'LTE', valueNumeric: 5000,  actionOnViolation: 'REQUIRE_APPROVAL', connector: 'AND', sortOrder: 40, message: 'Above ₹5000 threshold' })
  for (const cat of ['Entertainment','Alcohol','Personal Shopping']) {
    await R({ ruleType: 'RESTRICTED_CATEGORY', field: cat, operator: 'EQ',  valueText: cat, actionOnViolation: 'BLOCK', connector: 'AND', sortOrder: 50, message: `${cat} is restricted` })
  }

  // Budget categories & budgets
  const bcTravel = await prisma.budgetCategory.create({ data: { organizationId: org.id, name: 'Travel' } })
  const bcProject = await prisma.budgetCategory.create({ data: { organizationId: org.id, name: 'Project' } })
  const bcDept = await prisma.budgetCategory.create({ data: { organizationId: org.id, name: 'Department' } })
  const budgetTrip = await prisma.budget.create({ data: { organizationId: org.id, categoryId: bcTravel.id, name: 'Hyderabad Client Visit', type: 'TRAVEL',   amount: 25000, currencyCode: 'INR', startDate: new Date('2025-06-01'), endDate: new Date('2025-06-15'), costCenterId: ccOps.id, projectId: projNDV.id, employeeId: tej.id, breakdown: { food: 3000, hotel: 10000, travel: 12000 } } })
  const budgetProj = await prisma.budget.create({ data: { organizationId: org.id, categoryId: bcProject.id, name: 'NDV ERP Implementation', type: 'PROJECT',  amount: 250000, currencyCode: 'INR', startDate: new Date('2025-05-01'), endDate: new Date('2025-09-30'), costCenterId: ccPrj.id, projectId: projNDV.id, approvalRequired: true, breakdown: { food: 30000, hotel: 80000, travel: 90000, misc: 50000 } } })
  const budgetOps = await prisma.budget.create({ data: { organizationId: org.id, categoryId: bcDept.id, name: 'Operations Monthly', type: 'DEPARTMENT', amount: 180000, currencyCode: 'INR', startDate: new Date('2025-06-01'), endDate: new Date('2025-06-30'), costCenterId: ccOps.id, breakdown: { food: 40000, hotel: 60000, travel: 80000 } } })
  const budgetVik = await prisma.budget.create({ data: { organizationId: org.id, categoryId: bcTravel.id, name: 'Vikram Field Allowance', type: 'EMPLOYEE',  amount: 15000, currencyCode: 'INR', startDate: new Date('2025-06-01'), endDate: new Date('2025-06-30'), costCenterId: ccOps.id, projectId: projYard.id, employeeId: vikram.id, breakdown: { food: 5000, travel: 10000 } } })

  // Business Event + Trip
  const evtHyd = await prisma.businessEvent.create({ data: { organizationId: org.id, ownerEmployeeId: tej.id, projectId: projNDV.id, costCenterId: ccOps.id, type: 'CLIENT_VISIT', name: 'Hyderabad Client Visit – NDV Kickoff', location: 'Hyderabad', startDate: new Date('2025-06-02'), endDate: new Date('2025-06-05'), status: 'IN_PROGRESS' } })
  await prisma.trip.create({ data: { businessEventId: evtHyd.id, originCityId: cityBLR.id, destinationCityId: cityHyd.id, mode: 'FLIGHT' } })

  // Approval workflow (simple 1-step manager approval)
  const wf = await prisma.approvalWorkflow.create({ data: { organizationId: org.id, name: 'Default Manager Approval', entity: 'TRANSACTION', active: true } })
  const step1 = await prisma.approvalStep.create({ data: { workflowId: wf.id, sortOrder: 1, roleId: roleByName['Department Manager'].id, active: true } })

  // Spending rights for Tej and Vikram
  const srTej = await prisma.spendingRight.create({ data: { organizationId: org.id, employeeId: tej.id, projectId: projNDV.id, costCenterId: ccOps.id, businessEventId: evtHyd.id, policyId: policy.id, approvalWorkflowId: wf.id, allocatedAmount: 25000, currencyCode: 'INR', validityStart: new Date('2025-06-01'), validityEnd: new Date('2027-12-31'), singleTransactionLimit: 10000, dailyLimit: 8000, monthlyLimit: 25000, riskLevel: 'MEDIUM' } })
  const srVik = await prisma.spendingRight.create({ data: { organizationId: org.id, employeeId: vikram.id, projectId: projYard.id, costCenterId: ccOps.id, policyId: policy.id, approvalWorkflowId: wf.id, allocatedAmount: 15000, currencyCode: 'INR', validityStart: new Date('2025-06-01'), validityEnd: new Date('2027-12-31'), singleTransactionLimit: 5000, dailyLimit: 5000, riskLevel: 'LOW' } })
  for (const [name, mode] of [['Entertainment','BLOCKED'],['Alcohol','BLOCKED']]) {
    await prisma.spendingRightCategory.create({ data: { spendingRightId: srTej.id, transactionCategoryId: catByName[name].id, mode } })
    await prisma.spendingRightCategory.create({ data: { spendingRightId: srVik.id, transactionCategoryId: catByName[name].id, mode } })
  }

  // Historical transactions
  if (withHistory) {
    const now = new Date()
    const daysAgo = (n) => new Date(now.getTime() - n * 86400000)
    const T = async (data) => {
      const { txnRef } = require('../src/lib/idgen')
      return prisma.transaction.create({ data: { reference: txnRef(new Date(data.occurredAt || Date.now())), currencyCode: 'INR', organizationId: org.id, ...data } })
    }
    // Approved sample txns for Tej
    await T({ employeeId: tej.id,    managerId: rohit.id, projectId: projNDV.id, businessEventId: evtHyd.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['Taj Krishna Hyderabad'].id, merchantName: 'Taj Krishna Hyderabad', merchantCategoryId: mcHotel.id, transactionCategoryId: catByName['Hotel & Stay'].id, budgetId: budgetTrip.id, costCenterId: ccOps.id, amount: 8500, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(2), upiReference: 'UPI/12345/APPROVED' })
    await T({ employeeId: tej.id,    managerId: rohit.id, projectId: projNDV.id, businessEventId: evtHyd.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['Paradise Biryani'].id, merchantName: 'Paradise Biryani', merchantCategoryId: mcFood.id, transactionCategoryId: catByName['Food & Dining'].id, budgetId: budgetTrip.id, costCenterId: ccOps.id, amount: 1240, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(2) })
    await T({ employeeId: tej.id,    managerId: rohit.id, projectId: projNDV.id, businessEventId: evtHyd.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['Ola Cabs'].id, merchantName: 'Ola Cabs', merchantCategoryId: mcCab.id, transactionCategoryId: catByName['Travel'].id, budgetId: budgetTrip.id, costCenterId: ccOps.id, amount: 480, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(2) })
    await T({ employeeId: vikram.id, managerId: rohit.id, projectId: projYard.id, spendingRightId: srVik.id, policyId: policy.id, merchantId: merch['IndianOil Petrol'].id, merchantName: 'IndianOil Petrol', merchantCategoryId: mcFuel.id, transactionCategoryId: catByName['Fuel'].id, budgetId: budgetVik.id, costCenterId: ccOps.id, amount: 2100, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(1) })
    await T({ employeeId: vikram.id, managerId: rohit.id, projectId: projYard.id, spendingRightId: srVik.id, policyId: policy.id, merchantId: merch['Cafe Coffee Day'].id, merchantName: 'Cafe Coffee Day', merchantCategoryId: mcFood.id, transactionCategoryId: catByName['Food & Dining'].id, budgetId: budgetVik.id, costCenterId: ccOps.id, amount: 620, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(1) })
    await T({ employeeId: tej.id,    managerId: rohit.id, projectId: projNDV.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['OYO Rooms Vizag'].id, merchantName: 'OYO Rooms Vizag', merchantCategoryId: mcHotel.id, transactionCategoryId: catByName['Hotel & Stay'].id, budgetId: budgetProj.id, costCenterId: ccOps.id, amount: 4200, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(5) })
    await T({ employeeId: tej.id,    managerId: rohit.id, projectId: projNDV.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['Uber India'].id, merchantName: 'Uber India', merchantCategoryId: mcCab.id, transactionCategoryId: catByName['Travel'].id, budgetId: budgetProj.id, costCenterId: ccOps.id, amount: 1450, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(5) })
    await T({ employeeId: vikram.id, managerId: rohit.id, projectId: projYard.id, spendingRightId: srVik.id, policyId: policy.id, merchantId: merch['Reliance Smart'].id, merchantName: 'Reliance Smart', merchantCategoryId: mcGrocery.id, transactionCategoryId: catByName['Office Supplies'].id, budgetId: budgetOps.id, costCenterId: ccOps.id, amount: 3200, paymentStatus: 'APPROVED', approvalStatus: 'APPROVED', occurredAt: daysAgo(7) })
    // Rejected (restricted category)
    await T({ employeeId: tej.id,    managerId: rohit.id, projectId: projNDV.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['Hard Rock Cafe'].id, merchantName: 'Hard Rock Cafe', merchantCategoryId: mcEnter.id, transactionCategoryId: catByName['Entertainment'].id, budgetId: budgetProj.id, costCenterId: ccOps.id, amount: 2800, paymentStatus: 'REJECTED', approvalStatus: 'REJECTED', reason: 'Category is restricted', occurredAt: daysAgo(3), riskScore: 40 })
    // Pending (exceeds hotel limit)
    const pendTxn = await T({ employeeId: tej.id, managerId: rohit.id, projectId: projNDV.id, spendingRightId: srTej.id, policyId: policy.id, merchantId: merch['ITC Kakatiya'].id, merchantName: 'ITC Kakatiya', merchantCategoryId: mcHotel.id, transactionCategoryId: catByName['Hotel & Stay'].id, budgetId: budgetProj.id, costCenterId: ccOps.id, amount: 12500, paymentStatus: 'PENDING', approvalStatus: 'PENDING', reason: 'Exceeds hotel limit ₹5000 — needs approval', occurredAt: daysAgo(1), riskScore: 25 })
    // Approval record for pending
    const app = await prisma.approval.create({ data: { workflowId: wf.id, currentStepId: step1.id, subjectType: 'TRANSACTION', subjectId: pendTxn.id, requesterId: tej.id, status: 'PENDING' } })
    await prisma.approvalHistory.create({ data: { approvalId: app.id, stepId: step1.id, actorEmployeeId: tej.id, action: 'REQUESTED', note: 'Auto-routed for approval' } })

    // Accumulate spent on budgets/rights from approved txns
    const spentOnBudget = async (bid) => {
      const agg = await prisma.transaction.aggregate({ where: { budgetId: bid, paymentStatus: 'APPROVED' }, _sum: { amount: true } })
      await prisma.budget.update({ where: { id: bid }, data: { spent: agg._sum.amount || 0 } })
    }
    for (const b of [budgetTrip.id, budgetProj.id, budgetOps.id, budgetVik.id]) await spentOnBudget(b)
    for (const sr of [srTej.id, srVik.id]) {
      const agg = await prisma.transaction.aggregate({ where: { spendingRightId: sr, paymentStatus: 'APPROVED' }, _sum: { amount: true } })
      await prisma.spendingRight.update({ where: { id: sr }, data: { consumedAmount: agg._sum.amount || 0 } })
    }
  }

  // Audit stamp
  await prisma.auditLog.create({ data: { organizationId: org.id, actorEmployeeId: anika.id, action: 'CREATE', entity: 'ORGANIZATION', entityId: org.id, after: { name: org.legalName } } })

  return {
    orgId: org.id,
    counts: {
      organizations: 1,
      employees: await prisma.employee.count({ where: { organizationId: org.id } }),
      budgets: await prisma.budget.count({ where: { organizationId: org.id } }),
      transactions: await prisma.transaction.count({ where: { organizationId: org.id } }),
      policies: await prisma.policy.count({ where: { organizationId: org.id } }),
      policyRules: await prisma.policyRule.count(),
      spendingRights: await prisma.spendingRight.count(),
      merchants: await prisma.merchant.count(),
      approvals: await prisma.approval.count(),
      permissions: await prisma.permission.count(),
      roles: await prisma.employeeRole.count(),
    }
  }
}

// Allow running: node prisma/seed.js
if (require.main === module) {
  seed().then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0) }).catch(e => { console.error(e); process.exit(1) })
}
module.exports = { seed }
