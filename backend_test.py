#!/usr/bin/env python3
"""
CORPAY Backend Re-test Script
Tests the two bug fixes:
1. validateSpend resolves budget BEFORE category limit check
2. /api/pay strips _id from validation.budget in response
"""

import requests
import json
import sys

BASE_URL = "https://spend-governance.preview.emergentagent.com/api"

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def check_no_id_field(obj, path=""):
    """Recursively check for _id field in object"""
    if isinstance(obj, dict):
        if '_id' in obj:
            return f"Found _id at {path}"
        for key, value in obj.items():
            result = check_no_id_field(value, f"{path}.{key}" if path else key)
            if result:
                return result
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            result = check_no_id_field(item, f"{path}[{i}]")
            if result:
                return result
    return None

def test_seed():
    """A. POST /api/seed (reset state)"""
    print_section("A. POST /api/seed - Reset State")
    try:
        response = requests.post(f"{BASE_URL}/seed", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert data.get('seeded') == True, "Expected seeded=true"
        assert data.get('employees') == 5, f"Expected 5 employees, got {data.get('employees')}"
        assert data.get('budgets') == 4, f"Expected 4 budgets, got {data.get('budgets')}"
        assert data.get('transactions') == 10, f"Expected 10 transactions, got {data.get('transactions')}"
        
        print("✅ PASSED: Seed endpoint working correctly")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

def get_tej_employee_id():
    """B. Find Tej Kiran's employee id"""
    print_section("B. Find Tej Kiran's Employee ID")
    try:
        response = requests.get(f"{BASE_URL}/employees", timeout=10)
        print(f"Status: {response.status_code}")
        employees = response.json()
        
        tej = next((e for e in employees if e.get('name') == 'Tej Kiran'), None)
        assert tej is not None, "Tej Kiran not found in employees"
        
        tej_id = tej.get('id')
        print(f"Tej Kiran ID: {tej_id}")
        print(f"Tej Kiran details: {json.dumps(tej, indent=2)}")
        
        print("✅ PASSED: Found Tej Kiran's employee ID")
        return tej_id
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return None

def test_validate_spend_scenarios(tej_id):
    """Re-run validate-spend scenarios"""
    print_section("Validate-Spend Scenarios")
    
    scenarios = [
        {
            "name": "Small food (500) - should allow without approval",
            "payload": {"employeeId": tej_id, "amount": 500, "category": "Food & Dining"},
            "expected": {"allowed": True, "requiresApproval": False}
        },
        {
            "name": "Large food (2000) - should allow with approval (exceeds 1500 limit)",
            "payload": {"employeeId": tej_id, "amount": 2000, "category": "Food & Dining"},
            "expected": {"allowed": True, "requiresApproval": True}
        },
        {
            "name": "Entertainment (500) - should block (restricted category)",
            "payload": {"employeeId": tej_id, "amount": 500, "category": "Entertainment"},
            "expected": {"allowed": False}
        },
        {
            "name": "Large food (15000) - should block (exceeds 10000 per-txn limit)",
            "payload": {"employeeId": tej_id, "amount": 15000, "category": "Food & Dining"},
            "expected": {"allowed": False}
        }
    ]
    
    all_passed = True
    for scenario in scenarios:
        print(f"\n--- {scenario['name']} ---")
        try:
            response = requests.post(f"{BASE_URL}/validate-spend", json=scenario['payload'], timeout=10)
            print(f"Status: {response.status_code}")
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Check _id leak
            id_check = check_no_id_field(data)
            if id_check:
                print(f"❌ FAILED: {id_check}")
                all_passed = False
                continue
            
            # Check expected values
            for key, expected_value in scenario['expected'].items():
                actual_value = data.get(key)
                if actual_value != expected_value:
                    print(f"❌ FAILED: Expected {key}={expected_value}, got {actual_value}")
                    all_passed = False
                    break
            else:
                print(f"✅ PASSED: {scenario['name']}")
        except Exception as e:
            print(f"❌ FAILED: {str(e)}")
            all_passed = False
    
    return all_passed

def test_pay_with_approval_flow(tej_id):
    """C-H. Test the full approval flow"""
    print_section("C. POST /api/pay - Amount 2500 (triggers approval)")
    
    try:
        # C. POST /api/pay
        pay_payload = {
            "employeeId": tej_id,
            "amount": 2500,
            "category": "Food & Dining",
            "merchant": "Test Cafe"
        }
        response = requests.post(f"{BASE_URL}/pay", json=pay_payload, timeout=10)
        print(f"Status: {response.status_code}")
        pay_data = response.json()
        print(f"Response: {json.dumps(pay_data, indent=2)}")
        
        # Verify response structure
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert pay_data.get('success') == True, f"Expected success=true, got {pay_data.get('success')}"
        assert pay_data.get('status') == 'Pending', f"Expected status=Pending, got {pay_data.get('status')}"
        
        # Check validation.budget present
        validation = pay_data.get('validation', {})
        assert 'budget' in validation, "Expected validation.budget to be present"
        assert validation['budget'] is not None, "Expected validation.budget to not be null"
        
        # Check NO _id field in validation.budget
        id_check = check_no_id_field(pay_data)
        assert id_check is None, f"_id leak detected: {id_check}"
        
        # Check transaction has budgetId set (not null)
        transaction = pay_data.get('transaction', {})
        budget_id = transaction.get('budgetId')
        assert budget_id is not None, "Expected transaction.budgetId to be set (not null)"
        print(f"✅ Transaction budgetId: {budget_id}")
        
        transaction_id = transaction.get('id')
        print(f"✅ Transaction ID: {transaction_id}")
        
        print("✅ PASSED: /api/pay response correct - success=true, status=Pending, validation.budget present with NO _id, budgetId set")
        
        # D. GET /api/approvals - find the new pending approval
        print_section("D. GET /api/approvals - Find Pending Approval")
        response = requests.get(f"{BASE_URL}/approvals", timeout=10)
        print(f"Status: {response.status_code}")
        approvals = response.json()
        
        # Find the approval for our transaction
        approval = next((a for a in approvals if a.get('transactionId') == transaction_id), None)
        assert approval is not None, f"Approval not found for transaction {transaction_id}"
        
        approval_id = approval.get('id')
        print(f"Approval ID: {approval_id}")
        print(f"Approval details: {json.dumps(approval, indent=2)}")
        assert approval.get('status') == 'Pending', f"Expected approval status=Pending, got {approval.get('status')}"
        
        print("✅ PASSED: Found pending approval")
        
        # E. GET /api/budgets/{budgetId} - capture budget.spent BEFORE approval
        print_section("E. GET /api/budgets/{budgetId} - Capture spent BEFORE approval")
        response = requests.get(f"{BASE_URL}/budgets/{budget_id}", timeout=10)
        print(f"Status: {response.status_code}")
        budget_before = response.json()
        spent_before = budget_before.get('spent', 0)
        print(f"Budget spent BEFORE approval: {spent_before}")
        print(f"Budget details: {json.dumps(budget_before, indent=2)}")
        
        print("✅ PASSED: Captured budget.spent before approval")
        
        # F. POST /api/approvals/{id}/approve
        print_section("F. POST /api/approvals/{id}/approve - Approve Transaction")
        approve_payload = {
            "by": "Manager",
            "approverId": "mgr1"
        }
        response = requests.post(f"{BASE_URL}/approvals/{approval_id}/approve", json=approve_payload, timeout=10)
        print(f"Status: {response.status_code}")
        approve_data = response.json()
        print(f"Response: {json.dumps(approve_data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert approve_data.get('updated') == True, "Expected updated=true"
        assert approve_data.get('status') == 'Approved', f"Expected status=Approved, got {approve_data.get('status')}"
        
        print("✅ PASSED: Approval processed successfully")
        
        # G. GET /api/budgets/{budgetId} - confirm budget.spent INCREASED by 2500
        print_section("G. GET /api/budgets/{budgetId} - Verify spent INCREASED by 2500")
        response = requests.get(f"{BASE_URL}/budgets/{budget_id}", timeout=10)
        print(f"Status: {response.status_code}")
        budget_after = response.json()
        spent_after = budget_after.get('spent', 0)
        print(f"Budget spent AFTER approval: {spent_after}")
        print(f"Budget details: {json.dumps(budget_after, indent=2)}")
        
        expected_spent = spent_before + 2500
        assert spent_after == expected_spent, f"Expected spent={expected_spent}, got {spent_after}"
        
        print(f"✅ PASSED: Budget.spent increased correctly from {spent_before} to {spent_after} (+2500)")
        
        # H. GET /api/transactions - confirm transaction status is now 'Approved'
        print_section("H. GET /api/transactions - Verify Transaction Status = Approved")
        response = requests.get(f"{BASE_URL}/transactions", timeout=10)
        print(f"Status: {response.status_code}")
        transactions = response.json()
        
        # Find our transaction
        txn = next((t for t in transactions if t.get('id') == transaction_id), None)
        assert txn is not None, f"Transaction {transaction_id} not found"
        
        print(f"Transaction details: {json.dumps(txn, indent=2)}")
        assert txn.get('status') == 'Approved', f"Expected status=Approved, got {txn.get('status')}"
        
        print("✅ PASSED: Transaction status is now Approved")
        
        # I. Confirm NO _id field anywhere
        print_section("I. Verify NO _id Field in Any Response")
        
        # Check all responses we've collected
        responses_to_check = [
            ("pay response", pay_data),
            ("approvals list", approvals),
            ("budget before", budget_before),
            ("budget after", budget_after),
            ("transactions list", transactions)
        ]
        
        all_clean = True
        for name, data in responses_to_check:
            id_check = check_no_id_field(data)
            if id_check:
                print(f"❌ FAILED: _id leak in {name}: {id_check}")
                all_clean = False
            else:
                print(f"✅ {name}: No _id leaks")
        
        if all_clean:
            print("\n✅ PASSED: NO _id fields found in any response")
        
        return all_clean
        
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("  CORPAY BACKEND RE-TEST - Bug Fixes Verification")
    print("="*80)
    
    results = []
    
    # A. Seed
    results.append(("Seed endpoint", test_seed()))
    
    # B. Get Tej's ID
    tej_id = get_tej_employee_id()
    if not tej_id:
        print("\n❌ CRITICAL: Cannot proceed without Tej Kiran's employee ID")
        sys.exit(1)
    
    # Validate-spend scenarios
    results.append(("Validate-spend scenarios", test_validate_spend_scenarios(tej_id)))
    
    # C-I. Full approval flow
    results.append(("Pay + Approval flow", test_pay_with_approval_flow(tej_id)))
    
    # Summary
    print_section("FINAL SUMMARY")
    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*80)
    if all_passed:
        print("  🎉 ALL TESTS PASSED - Bug fixes verified successfully!")
    else:
        print("  ❌ SOME TESTS FAILED - Review output above")
    print("="*80 + "\n")
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
