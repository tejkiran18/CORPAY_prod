#!/usr/bin/env python3
"""
CORPAY Backend API Test Suite
Tests all backend endpoints per test_result.md requirements
"""

import requests
import json
import sys

BASE_URL = "https://spend-governance.preview.emergentagent.com/api"

def print_test(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"  Details: {details}")
    return passed

def test_seed():
    """Test 1: POST /api/seed creates demo data"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/seed - Create demo data")
    print("="*80)
    
    try:
        resp = requests.post(f"{BASE_URL}/seed", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Seed endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check structure
        if not data.get('seeded'):
            return print_test("Seed endpoint", False, "Missing 'seeded' field")
        
        # Check counts
        employees = data.get('employees', 0)
        budgets = data.get('budgets', 0)
        transactions = data.get('transactions', 0)
        
        if employees != 5:
            return print_test("Seed endpoint", False, f"Expected 5 employees, got {employees}")
        if budgets != 4:
            return print_test("Seed endpoint", False, f"Expected 4 budgets, got {budgets}")
        if transactions < 10:
            return print_test("Seed endpoint", False, f"Expected ≥10 transactions, got {transactions}")
        
        return print_test("Seed endpoint", True, f"Created {employees} employees, {budgets} budgets, {transactions} transactions")
    
    except Exception as e:
        return print_test("Seed endpoint", False, f"Exception: {str(e)}")

def test_organizations():
    """Test 2: GET /api/organizations - exactly 1 org"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/organizations")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/organizations", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Organizations endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if len(data) != 1:
            return print_test("Organizations endpoint", False, f"Expected 1 org, got {len(data)}")
        
        org = data[0]
        if org.get('name') != 'EPPS Infotech':
            return print_test("Organizations endpoint", False, f"Expected 'EPPS Infotech', got '{org.get('name')}'")
        
        if '_id' in org:
            return print_test("Organizations endpoint", False, "Found Mongo _id in response")
        
        return print_test("Organizations endpoint", True, f"Found 1 org: {org.get('name')}")
    
    except Exception as e:
        return print_test("Organizations endpoint", False, f"Exception: {str(e)}")

def test_departments():
    """Test 3: GET /api/departments - 3 departments with costCenter"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/departments")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/departments", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Departments endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if len(data) != 3:
            return print_test("Departments endpoint", False, f"Expected 3 departments, got {len(data)}")
        
        names = [d.get('name') for d in data]
        expected = ['Finance', 'Operations', 'Projects']
        
        for exp in expected:
            if exp not in names:
                return print_test("Departments endpoint", False, f"Missing department: {exp}")
        
        for dept in data:
            if not dept.get('costCenter'):
                return print_test("Departments endpoint", False, f"Department {dept.get('name')} missing costCenter")
            if '_id' in dept:
                return print_test("Departments endpoint", False, "Found Mongo _id in response")
        
        return print_test("Departments endpoint", True, f"Found 3 departments with costCenters: {', '.join(names)}")
    
    except Exception as e:
        return print_test("Departments endpoint", False, f"Exception: {str(e)}")

def test_projects():
    """Test 4: GET /api/projects - 2 projects with budgetCap"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/projects")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/projects", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Projects endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if len(data) != 2:
            return print_test("Projects endpoint", False, f"Expected 2 projects, got {len(data)}")
        
        names = [p.get('name') for p in data]
        expected = ['NDV ERP', 'Yard ERP']
        
        for exp in expected:
            if exp not in names:
                return print_test("Projects endpoint", False, f"Missing project: {exp}")
        
        for proj in data:
            if not proj.get('budgetCap'):
                return print_test("Projects endpoint", False, f"Project {proj.get('name')} missing budgetCap")
            if '_id' in proj:
                return print_test("Projects endpoint", False, "Found Mongo _id in response")
        
        return print_test("Projects endpoint", True, f"Found 2 projects with budgetCap: {', '.join(names)}")
    
    except Exception as e:
        return print_test("Projects endpoint", False, f"Exception: {str(e)}")

def test_employees():
    """Test 5: GET /api/employees - 5 employees including Tej Kiran"""
    print("\n" + "="*80)
    print("TEST 5: GET /api/employees")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/employees", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Employees endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if len(data) != 5:
            return print_test("Employees endpoint", False, f"Expected 5 employees, got {len(data)}")
        
        names = [e.get('name') for e in data]
        if 'Tej Kiran' not in names:
            return print_test("Employees endpoint", False, "Missing employee: Tej Kiran")
        
        tej = next((e for e in data if e.get('name') == 'Tej Kiran'), None)
        if not tej:
            return print_test("Employees endpoint", False, "Could not find Tej Kiran")
        
        if tej.get('role') != 'Employee':
            return print_test("Employees endpoint", False, f"Tej Kiran role should be 'Employee', got '{tej.get('role')}'")
        
        for emp in data:
            if '_id' in emp:
                return print_test("Employees endpoint", False, "Found Mongo _id in response")
        
        # Store Tej's ID for later tests
        global TEJ_ID
        TEJ_ID = tej.get('id')
        
        return print_test("Employees endpoint", True, f"Found 5 employees including Tej Kiran (Employee role)")
    
    except Exception as e:
        return print_test("Employees endpoint", False, f"Exception: {str(e)}")

def test_budgets():
    """Test 6: GET /api/budgets - 4 budgets including Hyderabad Client Visit"""
    print("\n" + "="*80)
    print("TEST 6: GET /api/budgets")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Budgets endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if len(data) != 4:
            return print_test("Budgets endpoint", False, f"Expected 4 budgets, got {len(data)}")
        
        names = [b.get('name') for b in data]
        if 'Hyderabad Client Visit' not in names:
            return print_test("Budgets endpoint", False, "Missing budget: Hyderabad Client Visit")
        
        hyd = next((b for b in data if b.get('name') == 'Hyderabad Client Visit'), None)
        if not hyd:
            return print_test("Budgets endpoint", False, "Could not find Hyderabad Client Visit budget")
        
        breakdown = hyd.get('breakdown', {})
        if breakdown.get('food') != 3000:
            return print_test("Budgets endpoint", False, f"Expected food: 3000, got {breakdown.get('food')}")
        if breakdown.get('hotel') != 10000:
            return print_test("Budgets endpoint", False, f"Expected hotel: 10000, got {breakdown.get('hotel')}")
        if breakdown.get('travel') != 12000:
            return print_test("Budgets endpoint", False, f"Expected travel: 12000, got {breakdown.get('travel')}")
        
        if hyd.get('amount') != 25000:
            return print_test("Budgets endpoint", False, f"Expected total: 25000, got {hyd.get('amount')}")
        
        for budget in data:
            if '_id' in budget:
                return print_test("Budgets endpoint", False, "Found Mongo _id in response")
        
        # Store budget ID for later tests
        global HYD_BUDGET_ID
        HYD_BUDGET_ID = hyd.get('id')
        
        return print_test("Budgets endpoint", True, "Found 4 budgets with correct breakdown")
    
    except Exception as e:
        return print_test("Budgets endpoint", False, f"Exception: {str(e)}")

def test_policies():
    """Test 7: GET /api/policies - 1 default policy with limits"""
    print("\n" + "="*80)
    print("TEST 7: GET /api/policies")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/policies", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("Policies endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if len(data) != 1:
            return print_test("Policies endpoint", False, f"Expected 1 policy, got {len(data)}")
        
        policy = data[0]
        
        checks = [
            ('foodLimit', 1500),
            ('hotelLimit', 5000),
            ('travelLimit', 4000),
            ('dailyLimit', 8000),
            ('perTransactionLimit', 10000),
            ('approvalThreshold', 5000),
        ]
        
        for field, expected in checks:
            if policy.get(field) != expected:
                return print_test("Policies endpoint", False, f"Expected {field}: {expected}, got {policy.get(field)}")
        
        if '_id' in policy:
            return print_test("Policies endpoint", False, "Found Mongo _id in response")
        
        return print_test("Policies endpoint", True, "Found 1 default policy with correct limits")
    
    except Exception as e:
        return print_test("Policies endpoint", False, f"Exception: {str(e)}")

def test_validate_spend():
    """Test 8: POST /api/validate-spend - validation engine"""
    print("\n" + "="*80)
    print("TEST 8: POST /api/validate-spend - Validation engine")
    print("="*80)
    
    all_passed = True
    
    # Test 8.1: Small food purchase - should be allowed, no approval
    print("\n--- Test 8.1: Small food purchase (500 INR) ---")
    try:
        payload = {
            "employeeId": TEJ_ID,
            "amount": 500,
            "category": "Food & Dining"
        }
        resp = requests.post(f"{BASE_URL}/validate-spend", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('allowed'):
            print_test("Validate: small food", False, "Should be allowed")
            all_passed = False
        elif data.get('requiresApproval'):
            print_test("Validate: small food", False, "Should not require approval")
            all_passed = False
        else:
            print_test("Validate: small food", True, "Allowed without approval")
    except Exception as e:
        print_test("Validate: small food", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 8.2: Large food purchase - should be allowed but require approval
    print("\n--- Test 8.2: Large food purchase (2000 INR, exceeds 1500 limit) ---")
    try:
        payload = {
            "employeeId": TEJ_ID,
            "amount": 2000,
            "category": "Food & Dining"
        }
        resp = requests.post(f"{BASE_URL}/validate-spend", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('allowed'):
            print_test("Validate: large food", False, "Should be allowed")
            all_passed = False
        elif not data.get('requiresApproval'):
            print_test("Validate: large food", False, "Should require approval (exceeds 1500 food limit)")
            all_passed = False
        else:
            print_test("Validate: large food", True, "Allowed with approval required")
    except Exception as e:
        print_test("Validate: large food", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 8.3: Travel above approval threshold
    print("\n--- Test 8.3: Travel (6000 INR, exceeds 5000 approval threshold) ---")
    try:
        payload = {
            "employeeId": TEJ_ID,
            "amount": 6000,
            "category": "Travel"
        }
        resp = requests.post(f"{BASE_URL}/validate-spend", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('allowed'):
            print_test("Validate: travel threshold", False, "Should be allowed")
            all_passed = False
        elif not data.get('requiresApproval'):
            print_test("Validate: travel threshold", False, "Should require approval (exceeds 5000 threshold)")
            all_passed = False
        else:
            print_test("Validate: travel threshold", True, "Allowed with approval required")
    except Exception as e:
        print_test("Validate: travel threshold", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 8.4: Restricted category - should be blocked
    print("\n--- Test 8.4: Restricted category (Entertainment) ---")
    try:
        payload = {
            "employeeId": TEJ_ID,
            "amount": 500,
            "category": "Entertainment"
        }
        resp = requests.post(f"{BASE_URL}/validate-spend", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('allowed'):
            print_test("Validate: restricted category", False, "Should be blocked (Entertainment is restricted)")
            all_passed = False
        else:
            print_test("Validate: restricted category", True, "Correctly blocked")
    except Exception as e:
        print_test("Validate: restricted category", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 8.5: Unknown category - should be blocked
    print("\n--- Test 8.5: Unknown category (Random) ---")
    try:
        payload = {
            "employeeId": TEJ_ID,
            "amount": 500,
            "category": "Random"
        }
        resp = requests.post(f"{BASE_URL}/validate-spend", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('allowed'):
            print_test("Validate: unknown category", False, "Should be blocked (not in allowed list)")
            all_passed = False
        else:
            print_test("Validate: unknown category", True, "Correctly blocked")
    except Exception as e:
        print_test("Validate: unknown category", False, f"Exception: {str(e)}")
        all_passed = False
    
    # Test 8.6: Exceeds per-transaction limit - should be blocked
    print("\n--- Test 8.6: Exceeds per-transaction limit (15000 INR) ---")
    try:
        payload = {
            "employeeId": TEJ_ID,
            "amount": 15000,
            "category": "Food & Dining"
        }
        resp = requests.post(f"{BASE_URL}/validate-spend", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('allowed'):
            print_test("Validate: per-txn limit", False, "Should be blocked (exceeds 10000 per-txn limit)")
            all_passed = False
        else:
            print_test("Validate: per-txn limit", True, "Correctly blocked")
    except Exception as e:
        print_test("Validate: per-txn limit", False, f"Exception: {str(e)}")
        all_passed = False
    
    return all_passed

def test_pay_approved():
    """Test 9: POST /api/pay - approved transaction"""
    print("\n" + "="*80)
    print("TEST 9: POST /api/pay - Approved transaction")
    print("="*80)
    
    try:
        # Get initial budget spent
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        budgets_before = resp.json()
        hyd_before = next((b for b in budgets_before if b.get('name') == 'Hyderabad Client Visit'), None)
        spent_before = hyd_before.get('spent', 0) if hyd_before else 0
        print(f"Budget spent before: {spent_before}")
        
        # Make payment
        payload = {
            "employeeId": TEJ_ID,
            "amount": 600,
            "category": "Food & Dining",
            "merchant": "Test Cafe"
        }
        resp = requests.post(f"{BASE_URL}/pay", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success'):
            return print_test("Pay: approved transaction", False, "Payment should succeed")
        
        if data.get('status') != 'Approved':
            return print_test("Pay: approved transaction", False, f"Expected status 'Approved', got '{data.get('status')}'")
        
        txn = data.get('transaction', {})
        if not txn.get('id'):
            return print_test("Pay: approved transaction", False, "Missing transaction ID")
        
        if '_id' in txn:
            return print_test("Pay: approved transaction", False, "Found Mongo _id in transaction")
        
        # Verify budget spent increased
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        budgets_after = resp.json()
        hyd_after = next((b for b in budgets_after if b.get('name') == 'Hyderabad Client Visit'), None)
        spent_after = hyd_after.get('spent', 0) if hyd_after else 0
        print(f"Budget spent after: {spent_after}")
        
        if spent_after != spent_before + 600:
            return print_test("Pay: approved transaction", False, f"Budget spent should increase by 600, was {spent_before}, now {spent_after}")
        
        return print_test("Pay: approved transaction", True, "Transaction approved and budget updated")
    
    except Exception as e:
        return print_test("Pay: approved transaction", False, f"Exception: {str(e)}")

def test_pay_pending():
    """Test 10: POST /api/pay - pending approval transaction"""
    print("\n" + "="*80)
    print("TEST 10: POST /api/pay - Pending approval transaction")
    print("="*80)
    
    try:
        # Get initial budget spent
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        budgets_before = resp.json()
        hyd_before = next((b for b in budgets_before if b.get('name') == 'Hyderabad Client Visit'), None)
        spent_before = hyd_before.get('spent', 0) if hyd_before else 0
        print(f"Budget spent before: {spent_before}")
        
        # Make payment that requires approval
        payload = {
            "employeeId": TEJ_ID,
            "amount": 2500,
            "category": "Food & Dining",
            "merchant": "Expensive Restaurant"
        }
        resp = requests.post(f"{BASE_URL}/pay", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('success'):
            return print_test("Pay: pending transaction", False, "Payment should succeed")
        
        if data.get('status') != 'Pending':
            return print_test("Pay: pending transaction", False, f"Expected status 'Pending', got '{data.get('status')}'")
        
        txn = data.get('transaction', {})
        txn_id = txn.get('id')
        if not txn_id:
            return print_test("Pay: pending transaction", False, "Missing transaction ID")
        
        # Verify budget NOT increased yet
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        budgets_after = resp.json()
        hyd_after = next((b for b in budgets_after if b.get('name') == 'Hyderabad Client Visit'), None)
        spent_after = hyd_after.get('spent', 0) if hyd_after else 0
        print(f"Budget spent after (should be same): {spent_after}")
        
        if spent_after != spent_before:
            return print_test("Pay: pending transaction", False, f"Budget should not change for pending txn, was {spent_before}, now {spent_after}")
        
        # Get approvals
        resp = requests.get(f"{BASE_URL}/approvals", timeout=10)
        approvals = resp.json()
        print(f"Approvals: {json.dumps(approvals, indent=2)}")
        
        # Find the new approval
        approval = next((a for a in approvals if a.get('transactionId') == txn_id), None)
        if not approval:
            return print_test("Pay: pending transaction", False, "Approval record not created")
        
        if approval.get('status') != 'Pending':
            return print_test("Pay: pending transaction", False, f"Approval status should be 'Pending', got '{approval.get('status')}'")
        
        # Store approval ID for next test
        global APPROVAL_ID
        APPROVAL_ID = approval.get('id')
        
        return print_test("Pay: pending transaction", True, "Transaction pending with approval created")
    
    except Exception as e:
        return print_test("Pay: pending transaction", False, f"Exception: {str(e)}")

def test_approval_approve():
    """Test 11: POST /api/approvals/{id}/approve"""
    print("\n" + "="*80)
    print("TEST 11: POST /api/approvals/{id}/approve")
    print("="*80)
    
    try:
        if not APPROVAL_ID:
            return print_test("Approval: approve", False, "No approval ID from previous test")
        
        # Get initial budget spent
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        budgets_before = resp.json()
        hyd_before = next((b for b in budgets_before if b.get('name') == 'Hyderabad Client Visit'), None)
        spent_before = hyd_before.get('spent', 0) if hyd_before else 0
        print(f"Budget spent before approval: {spent_before}")
        
        # Approve
        payload = {
            "by": "Manager",
            "approverId": "test-manager-id"
        }
        resp = requests.post(f"{BASE_URL}/approvals/{APPROVAL_ID}/approve", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('updated'):
            return print_test("Approval: approve", False, "Approval should be updated")
        
        if data.get('status') != 'Approved':
            return print_test("Approval: approve", False, f"Expected status 'Approved', got '{data.get('status')}'")
        
        # Verify approval updated
        resp = requests.get(f"{BASE_URL}/approvals/{APPROVAL_ID}", timeout=10)
        approval = resp.json()
        print(f"Approval after: {json.dumps(approval, indent=2)}")
        
        if approval.get('status') != 'Approved':
            return print_test("Approval: approve", False, f"Approval status should be 'Approved', got '{approval.get('status')}'")
        
        # Verify transaction updated
        txn_id = approval.get('transactionId')
        resp = requests.get(f"{BASE_URL}/transactions/{txn_id}", timeout=10)
        txn = resp.json()
        print(f"Transaction after: {json.dumps(txn, indent=2)}")
        
        if txn.get('status') != 'Approved':
            return print_test("Approval: approve", False, f"Transaction status should be 'Approved', got '{txn.get('status')}'")
        
        # Verify budget increased by 2500
        resp = requests.get(f"{BASE_URL}/budgets", timeout=10)
        budgets_after = resp.json()
        hyd_after = next((b for b in budgets_after if b.get('name') == 'Hyderabad Client Visit'), None)
        spent_after = hyd_after.get('spent', 0) if hyd_after else 0
        print(f"Budget spent after approval: {spent_after}")
        
        if spent_after != spent_before + 2500:
            return print_test("Approval: approve", False, f"Budget spent should increase by 2500, was {spent_before}, now {spent_after}")
        
        return print_test("Approval: approve", True, "Approval processed, transaction and budget updated")
    
    except Exception as e:
        return print_test("Approval: approve", False, f"Exception: {str(e)}")

def test_pay_rejected():
    """Test 12: POST /api/pay - rejected transaction"""
    print("\n" + "="*80)
    print("TEST 12: POST /api/pay - Rejected transaction")
    print("="*80)
    
    try:
        # Try to pay with restricted category
        payload = {
            "employeeId": TEJ_ID,
            "amount": 500,
            "category": "Entertainment",
            "merchant": "Night Club"
        }
        resp = requests.post(f"{BASE_URL}/pay", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('success'):
            return print_test("Pay: rejected transaction", False, "Payment should fail for restricted category")
        
        if data.get('status') != 'Rejected':
            return print_test("Pay: rejected transaction", False, f"Expected status 'Rejected', got '{data.get('status')}'")
        
        # Note: The current implementation doesn't create a transaction for blocked payments
        # This is actually correct behavior - no transaction should be created
        
        return print_test("Pay: rejected transaction", True, "Transaction correctly rejected")
    
    except Exception as e:
        return print_test("Pay: rejected transaction", False, f"Exception: {str(e)}")

def test_kpis():
    """Test 13: GET /api/kpis"""
    print("\n" + "="*80)
    print("TEST 13: GET /api/kpis")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/kpis", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("KPIs endpoint", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check required fields
        required = ['totalAllocated', 'totalSpent', 'remaining', 'pendingCount', 'violations', 'utilization', 'byDept', 'byProject', 'categoryData', 'monthly']
        
        for field in required:
            if field not in data:
                return print_test("KPIs endpoint", False, f"Missing field: {field}")
        
        # Check byDept is array
        if not isinstance(data.get('byDept'), list):
            return print_test("KPIs endpoint", False, "byDept should be array")
        
        # Check byProject is array
        if not isinstance(data.get('byProject'), list):
            return print_test("KPIs endpoint", False, "byProject should be array")
        
        # Check categoryData is array
        if not isinstance(data.get('categoryData'), list):
            return print_test("KPIs endpoint", False, "categoryData should be array")
        
        # Check monthly is array with 6 months
        monthly = data.get('monthly', [])
        if not isinstance(monthly, list):
            return print_test("KPIs endpoint", False, "monthly should be array")
        
        if len(monthly) != 6:
            return print_test("KPIs endpoint", False, f"monthly should have 6 entries, got {len(monthly)}")
        
        # Check monthly structure
        for m in monthly:
            if 'month' not in m or 'spent' not in m or 'allocated' not in m:
                return print_test("KPIs endpoint", False, f"Monthly entry missing fields: {m}")
        
        return print_test("KPIs endpoint", True, f"All KPI fields present with correct structure")
    
    except Exception as e:
        return print_test("KPIs endpoint", False, f"Exception: {str(e)}")

def test_crud_spot_check():
    """Test 14: CRUD spot check"""
    print("\n" + "="*80)
    print("TEST 14: CRUD spot check")
    print("="*80)
    
    try:
        # Create a test budget
        print("\n--- Creating test budget ---")
        payload = {
            "name": "Test Budget",
            "amount": 1000,
            "type": "Department",
            "spent": 0,
            "status": "Active"
        }
        resp = requests.post(f"{BASE_URL}/budgets", json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 201:
            return print_test("CRUD: create", False, f"Expected 201, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        budget_id = data.get('id')
        if not budget_id:
            return print_test("CRUD: create", False, "Missing ID in created budget")
        
        # Check it's a UUID (has dashes)
        if '-' not in budget_id:
            return print_test("CRUD: create", False, f"ID should be UUID, got: {budget_id}")
        
        if '_id' in data:
            return print_test("CRUD: create", False, "Found Mongo _id in response")
        
        print(f"✅ Created budget with UUID: {budget_id}")
        
        # Get the budget
        print("\n--- Getting test budget ---")
        resp = requests.get(f"{BASE_URL}/budgets/{budget_id}", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("CRUD: get", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('name') != 'Test Budget':
            return print_test("CRUD: get", False, f"Expected name 'Test Budget', got '{data.get('name')}'")
        
        if '_id' in data:
            return print_test("CRUD: get", False, "Found Mongo _id in response")
        
        print(f"✅ Retrieved budget successfully")
        
        # Delete the budget
        print("\n--- Deleting test budget ---")
        resp = requests.delete(f"{BASE_URL}/budgets/{budget_id}", timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            return print_test("CRUD: delete", False, f"Expected 200, got {resp.status_code}")
        
        data = resp.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if not data.get('deleted'):
            return print_test("CRUD: delete", False, "Expected deleted: true")
        
        print(f"✅ Deleted budget successfully")
        
        return print_test("CRUD spot check", True, "Create, Get, Delete all working with UUID")
    
    except Exception as e:
        return print_test("CRUD spot check", False, f"Exception: {str(e)}")

def main():
    print("\n" + "="*80)
    print("CORPAY BACKEND API TEST SUITE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    results = []
    
    # Run tests in order
    results.append(("Seed", test_seed()))
    results.append(("Organizations", test_organizations()))
    results.append(("Departments", test_departments()))
    results.append(("Projects", test_projects()))
    results.append(("Employees", test_employees()))
    results.append(("Budgets", test_budgets()))
    results.append(("Policies", test_policies()))
    results.append(("Validate Spend", test_validate_spend()))
    results.append(("Pay Approved", test_pay_approved()))
    results.append(("Pay Pending", test_pay_pending()))
    results.append(("Approval Approve", test_approval_approve()))
    results.append(("Pay Rejected", test_pay_rejected()))
    results.append(("KPIs", test_kpis()))
    results.append(("CRUD", test_crud_spot_check()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    # Global variables for test data
    TEJ_ID = None
    HYD_BUDGET_ID = None
    APPROVAL_ID = None
    
    main()
