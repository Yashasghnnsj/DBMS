import requests
import json

BASE_URL = "http://127.0.0.1:5000/api"

def test_auth():
    print("--- Testing Authentication Flow ---")
    
    # 1. Register/Login
    email = "test_debug@example.com"
    password = "password123"
    
    print(f"1. Attempting login for {email}...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    token = None
    if login_resp.status_code == 200:
        print("   Login Successful")
        token = login_resp.json().get('access_token')
    elif login_resp.status_code == 401:
         print("   Login Failed (Expected if user doesn't exist)")
         # Try Register
         print(f"2. Registering {email}...")
         reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
             "email": email,
             "password": password,
             "full_name": "Debug User",
             "date_of_birth": "2000-01-01"
         })
         if reg_resp.status_code == 201:
             print("   Registration Successful")
             token = reg_resp.json().get('access_token') 
             # Note: register usually returns user but maybe not token directly in this app, let's login again
             if not token:
                 l2 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
                 token = l2.json().get('access_token')
         else:
             print(f"   Registration Failed: {reg_resp.text}")
             return

    if not token:
        print("❌ Could not get token.")
        return

    print(f"   Token obtained: {token[:20]}...")

    # 2. Test Dashboard Access
    print("\n3. Testing Dashboard Access with Token...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check Stats
    stats_resp = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    print(f"   GET /dashboard/stats -> {stats_resp.status_code}")
    if stats_resp.status_code != 200:
        print(f"   Error: {stats_resp.text}")
    else:
        print("   ✅ /stats works!")

    # Check Activity
    act_resp = requests.get(f"{BASE_URL}/dashboard/activity", headers=headers)
    print(f"   GET /dashboard/activity -> {act_resp.status_code}")
    
    if stats_resp.status_code == 401:
        print("\n❌ AUTH DIAGNOSIS: Backend is rejecting the token immediately.")
    else:
        print("\n✅ AUTH DIAGNOSIS: Token works locally. Issue might be browser/CORS related.")

if __name__ == "__main__":
    test_auth()
