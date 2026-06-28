#!/usr/bin/env python3
"""
CORPAY Backend Round 2 Testing
Tests new endpoints: login, llm/forecast, llm/coach, transactions/export, kpis/cost-centers, kpis/monthly-closure
Plus regression tests for existing endpoints
"""

import requests
import json
import sys
import time

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
    """Seed database with demo data"""
    print_section("SETUP: POST /api/seed")
    try:
        response = requests.post(f"{BASE_URL}/seed", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert data.get('seeded') == True, "Expected seeded=true"
        
        print("✅ PASSED: Database seeded successfully")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

# ============================================================================
# TEST 1: POST /api/login
# ============================================================================

def test_login_anika():
    """Test 1a: Login with anika@eppsinfotech.com"""
    print_section("TEST 1a: POST /api/login - Anika (Finance Head)")
    try:
        payload = {"email": "anika@eppsinfotech.com"}
        response = requests.post(f"{BASE_URL}/login", json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'user' in data, "Expected 'user' in response"
        assert 'token' in data, "Expected 'token' in response"
        
        user = data['user']
        token = data['token']
        
        assert user.get('role') == 'Finance Head', f"Expected role='Finance Head', got {user.get('role')}"
        assert token.startswith('demo-jwt-'), f"Expected token to start with 'demo-jwt-', got {token}"
        
        # Check no _id leak
        id_check = check_no_id_field(data)
        assert id_check is None, f"_id leak detected: {id_check}"
        
        print("✅ PASSED: Login successful for Anika with role='Finance Head' and valid token")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_login_tej():
    """Test 1b: Login with tej@eppsinfotech.com"""
    print_section("TEST 1b: POST /api/login - Tej (Employee)")
    try:
        payload = {"email": "tej@eppsinfotech.com"}
        response = requests.post(f"{BASE_URL}/login", json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'user' in data, "Expected 'user' in response"
        assert 'token' in data, "Expected 'token' in response"
        
        user = data['user']
        token = data['token']
        
        assert user.get('role') == 'Employee', f"Expected role='Employee', got {user.get('role')}"
        assert token.startswith('demo-jwt-'), f"Expected token to start with 'demo-jwt-', got {token}"
        
        print("✅ PASSED: Login successful for Tej with role='Employee' and valid token")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_login_invalid():
    """Test 1c: Login with invalid email"""
    print_section("TEST 1c: POST /api/login - Invalid Email")
    try:
        payload = {"email": "nobody@test.com"}
        response = requests.post(f"{BASE_URL}/login", json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        assert 'error' in data, "Expected 'error' in response"
        
        print("✅ PASSED: Invalid email correctly returns 404 with error message")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================================================================
# TEST 2: POST /api/llm/forecast
# ============================================================================

def test_llm_forecast():
    """Test 2: POST /api/llm/forecast"""
    print_section("TEST 2: POST /api/llm/forecast - AI Spend Forecast")
    try:
        payload = {
            "kpis": {
                "totalAllocated": 470000,
                "totalSpent": 32040,
                "remaining": 437960,
                "utilization": 7,
                "pendingCount": 0,
                "violations": 2
            }
        }
        response = requests.post(f"{BASE_URL}/llm/forecast", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'insight' in data, "Expected 'insight' in response"
        assert 'model' in data, "Expected 'model' in response"
        
        insight = data['insight']
        assert 'headline' in insight, "Expected 'headline' in insight"
        assert 'forecast' in insight, "Expected 'forecast' in insight"
        assert 'risks' in insight, "Expected 'risks' in insight"
        assert 'actions' in insight, "Expected 'actions' in insight"
        
        # Verify risks is an array with at least 1 item
        assert isinstance(insight['risks'], list), f"Expected risks to be array, got {type(insight['risks'])}"
        assert len(insight['risks']) >= 1, f"Expected risks array length >= 1, got {len(insight['risks'])}"
        
        # Verify actions is an array with at least 1 item
        assert isinstance(insight['actions'], list), f"Expected actions to be array, got {type(insight['actions'])}"
        assert len(insight['actions']) >= 1, f"Expected actions array length >= 1, got {len(insight['actions'])}"
        
        print(f"✅ PASSED: LLM forecast returned with {len(insight['risks'])} risks and {len(insight['actions'])} actions")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================================================================
# TEST 3: POST /api/llm/coach
# ============================================================================

def test_llm_coach_single_turn():
    """Test 3a: POST /api/llm/coach - Single turn"""
    print_section("TEST 3a: POST /api/llm/coach - Single Turn (Daily Limit)")
    try:
        payload = {
            "question": "What is my daily limit?"
        }
        response = requests.post(f"{BASE_URL}/llm/coach", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'answer' in data, "Expected 'answer' in response"
        assert 'model' in data, "Expected 'model' in response"
        
        answer = data['answer']
        # Verify answer mentions 8,000 or 8000 (the daily limit)
        assert '8,000' in answer or '8000' in answer or '8000' in answer.replace(',', ''), \
            f"Expected answer to mention daily limit 8,000 or 8000, got: {answer}"
        
        print("✅ PASSED: LLM coach answered daily limit question correctly")
        return data['answer']  # Return for multi-turn test
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_llm_coach_multi_turn(first_answer):
    """Test 3b: POST /api/llm/coach - Multi-turn with history"""
    print_section("TEST 3b: POST /api/llm/coach - Multi-Turn (Hotel Limit)")
    try:
        payload = {
            "question": "And per hotel night?",
            "history": [
                {"role": "user", "content": "What is my daily limit?"},
                {"role": "assistant", "content": first_answer}
            ]
        }
        response = requests.post(f"{BASE_URL}/llm/coach", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'answer' in data, "Expected 'answer' in response"
        
        answer = data['answer']
        # Verify answer mentions 5,000 or 5000 (the hotel limit)
        assert '5,000' in answer or '5000' in answer or '5000' in answer.replace(',', ''), \
            f"Expected answer to mention hotel limit 5,000 or 5000, got: {answer}"
        
        print("✅ PASSED: LLM coach multi-turn conversation working correctly")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================================================================
# TEST 4: GET /api/transactions/export
# ============================================================================

def test_transactions_export():
    """Test 4: GET /api/transactions/export - CSV export"""
    print_section("TEST 4: GET /api/transactions/export - CSV Export")
    try:
        response = requests.get(f"{BASE_URL}/transactions/export", timeout=10)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check Content-Type header
        content_type = response.headers.get('Content-Type', '')
        print(f"Content-Type: {content_type}")
        assert content_type.startswith('text/csv'), f"Expected Content-Type to start with 'text/csv', got {content_type}"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get('Content-Disposition', '')
        print(f"Content-Disposition: {content_disposition}")
        assert 'attachment' in content_disposition, f"Expected 'attachment' in Content-Disposition, got {content_disposition}"
        assert '.csv' in content_disposition, f"Expected '.csv' in Content-Disposition, got {content_disposition}"
        
        # Check CSV content
        csv_content = response.text
        lines = csv_content.strip().split('\n')
        print(f"CSV lines count: {len(lines)}")
        print(f"First line (header): {lines[0]}")
        
        # Verify header row
        expected_header = "TxnID,Date,Merchant,Category,Amount (INR),Method,Status,Employee,Designation,Department,Cost Center,Project,Reason"
        assert lines[0] == expected_header, f"Expected header: {expected_header}, got: {lines[0]}"
        
        # Verify at least 10 data rows (one per seeded transaction)
        data_rows = len(lines) - 1  # Exclude header
        assert data_rows >= 10, f"Expected at least 10 data rows, got {data_rows}"
        
        print(f"Sample data row: {lines[1]}")
        print("✅ PASSED: CSV export working correctly with proper headers and data")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================================================================
# TEST 5: GET /api/kpis/cost-centers
# ============================================================================

def test_kpis_cost_centers():
    """Test 5: GET /api/kpis/cost-centers"""
    print_section("TEST 5: GET /api/kpis/cost-centers - Cost Center Aggregation")
    try:
        response = requests.get(f"{BASE_URL}/kpis/cost-centers", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(data, list), f"Expected array response, got {type(data)}"
        assert len(data) >= 3, f"Expected at least 3 cost centers, got {len(data)}"
        
        # Find specific cost centers
        cc_codes = [cc['code'] for cc in data]
        print(f"Cost center codes: {cc_codes}")
        
        assert 'CC-FIN-001' in cc_codes, "Expected CC-FIN-001 in cost centers"
        assert 'CC-OPS-001' in cc_codes, "Expected CC-OPS-001 in cost centers"
        assert 'CC-PRJ-001' in cc_codes, "Expected CC-PRJ-001 in cost centers"
        
        # Verify structure of each cost center
        required_keys = ['code', 'department', 'allocated', 'spent', 'pending', 'txnCount', 'violations', 'utilization', 'remaining']
        for cc in data:
            for key in required_keys:
                assert key in cc, f"Expected key '{key}' in cost center {cc.get('code')}"
        
        # Verify CC-OPS-001 (Operations) has non-zero txnCount and spent
        cc_ops = next((cc for cc in data if cc['code'] == 'CC-OPS-001'), None)
        assert cc_ops is not None, "CC-OPS-001 not found"
        assert cc_ops['txnCount'] > 0, f"Expected CC-OPS-001 txnCount > 0, got {cc_ops['txnCount']}"
        assert cc_ops['spent'] > 0, f"Expected CC-OPS-001 spent > 0, got {cc_ops['spent']}"
        
        print("✅ PASSED: Cost centers endpoint working correctly with all required fields")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================================================================
# TEST 6: GET /api/kpis/monthly-closure
# ============================================================================

def test_monthly_closure_current():
    """Test 6a: GET /api/kpis/monthly-closure - Current month"""
    print_section("TEST 6a: GET /api/kpis/monthly-closure - Current Month")
    try:
        response = requests.get(f"{BASE_URL}/kpis/monthly-closure", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify required keys
        required_keys = ['month', 'period', 'txnCount', 'approvedCount', 'pending', 'violations', 
                        'totalSpent', 'totalAllocated', 'byDept', 'byProject', 'byCategory', 
                        'topMerchants', 'closureStatus']
        for key in required_keys:
            assert key in data, f"Expected key '{key}' in response"
        
        # Verify month is a string
        assert isinstance(data['month'], str), f"Expected month to be string, got {type(data['month'])}"
        
        # Verify arrays
        assert isinstance(data['byDept'], list), "Expected byDept to be array"
        assert isinstance(data['byProject'], list), "Expected byProject to be array"
        assert isinstance(data['byCategory'], list), "Expected byCategory to be array"
        assert isinstance(data['topMerchants'], list), "Expected topMerchants to be array"
        
        # Verify topMerchants structure
        assert len(data['topMerchants']) <= 5, f"Expected topMerchants length <= 5, got {len(data['topMerchants'])}"
        if len(data['topMerchants']) > 0:
            merchant = data['topMerchants'][0]
            assert 'name' in merchant, "Expected 'name' in topMerchants item"
            assert 'amount' in merchant, "Expected 'amount' in topMerchants item"
            # Verify sorted descending
            if len(data['topMerchants']) > 1:
                assert data['topMerchants'][0]['amount'] >= data['topMerchants'][1]['amount'], \
                    "Expected topMerchants to be sorted descending by amount"
        
        print("✅ PASSED: Monthly closure (current month) working correctly")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_monthly_closure_specific():
    """Test 6b: GET /api/kpis/monthly-closure?month=2025-06 - Specific month"""
    print_section("TEST 6b: GET /api/kpis/monthly-closure?month=2025-06 - June 2025")
    try:
        response = requests.get(f"{BASE_URL}/kpis/monthly-closure?month=2025-06", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify month string contains "June" and "2025"
        month_str = data.get('month', '')
        assert 'June' in month_str or 'june' in month_str.lower(), f"Expected 'June' in month string, got {month_str}"
        assert '2025' in month_str, f"Expected '2025' in month string, got {month_str}"
        
        print("✅ PASSED: Monthly closure with specific month parameter working correctly")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================================================================
# TEST 7: REGRESSION TESTS
# ============================================================================

def test_regression_kpis():
    """Test 7a: Regression - GET /api/kpis"""
    print_section("TEST 7a: REGRESSION - GET /api/kpis")
    try:
        response = requests.get(f"{BASE_URL}/kpis", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check no _id leak
        id_check = check_no_id_field(data)
        assert id_check is None, f"_id leak detected: {id_check}"
        
        print("✅ PASSED: GET /api/kpis still working, no _id leaks")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

def test_regression_budgets():
    """Test 7b: Regression - GET /api/budgets"""
    print_section("TEST 7b: REGRESSION - GET /api/budgets")
    try:
        response = requests.get(f"{BASE_URL}/budgets", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Budgets count: {len(data)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(data, list), "Expected array response"
        
        # Check no _id leak
        id_check = check_no_id_field(data)
        assert id_check is None, f"_id leak detected: {id_check}"
        
        print("✅ PASSED: GET /api/budgets still working, no _id leaks")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

def test_regression_employees():
    """Test 7c: Regression - GET /api/employees"""
    print_section("TEST 7c: REGRESSION - GET /api/employees")
    try:
        response = requests.get(f"{BASE_URL}/employees", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Employees count: {len(data)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(data, list), "Expected array response"
        
        # Check no _id leak
        id_check = check_no_id_field(data)
        assert id_check is None, f"_id leak detected: {id_check}"
        
        print("✅ PASSED: GET /api/employees still working, no _id leaks")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

def test_regression_policies():
    """Test 7d: Regression - GET /api/policies"""
    print_section("TEST 7d: REGRESSION - GET /api/policies")
    try:
        response = requests.get(f"{BASE_URL}/policies", timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Policies count: {len(data)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(data, list), "Expected array response"
        
        # Check no _id leak
        id_check = check_no_id_field(data)
        assert id_check is None, f"_id leak detected: {id_check}"
        
        print("✅ PASSED: GET /api/policies still working, no _id leaks")
        return True
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "="*80)
    print("  CORPAY BACKEND ROUND 2 TESTING")
    print("  Testing new endpoints + regression tests")
    print("="*80)
    
    results = []
    
    # Setup: Seed database
    if not test_seed():
        print("\n❌ CRITICAL: Cannot proceed without seeding database")
        sys.exit(1)
    
    # TEST 1: Login
    results.append(("1a. Login - Anika (Finance Head)", test_login_anika()))
    results.append(("1b. Login - Tej (Employee)", test_login_tej()))
    results.append(("1c. Login - Invalid Email", test_login_invalid()))
    
    # TEST 2: LLM Forecast
    results.append(("2. LLM Forecast", test_llm_forecast()))
    
    # TEST 3: LLM Coach
    first_answer = test_llm_coach_single_turn()
    if first_answer:
        results.append(("3a. LLM Coach - Single Turn", True))
        results.append(("3b. LLM Coach - Multi-Turn", test_llm_coach_multi_turn(first_answer)))
    else:
        results.append(("3a. LLM Coach - Single Turn", False))
        results.append(("3b. LLM Coach - Multi-Turn", False))
    
    # TEST 4: Transactions Export
    results.append(("4. Transactions CSV Export", test_transactions_export()))
    
    # TEST 5: Cost Centers
    results.append(("5. KPIs Cost Centers", test_kpis_cost_centers()))
    
    # TEST 6: Monthly Closure
    results.append(("6a. Monthly Closure - Current", test_monthly_closure_current()))
    results.append(("6b. Monthly Closure - Specific Month", test_monthly_closure_specific()))
    
    # TEST 7: Regression Tests
    results.append(("7a. Regression - GET /api/kpis", test_regression_kpis()))
    results.append(("7b. Regression - GET /api/budgets", test_regression_budgets()))
    results.append(("7c. Regression - GET /api/employees", test_regression_employees()))
    results.append(("7d. Regression - GET /api/policies", test_regression_policies()))
    
    # Summary
    print_section("FINAL SUMMARY")
    all_passed = True
    passed_count = 0
    failed_tests = []
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if passed:
            passed_count += 1
        else:
            all_passed = False
            failed_tests.append(name)
    
    print("\n" + "="*80)
    print(f"  RESULTS: {passed_count}/{len(results)} tests passed")
    if all_passed:
        print("  🎉 ALL TESTS PASSED!")
    else:
        print(f"  ❌ {len(failed_tests)} TESTS FAILED:")
        for test in failed_tests:
            print(f"     - {test}")
    print("="*80 + "\n")
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
