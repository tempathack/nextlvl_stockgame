#!/usr/bin/env python3
"""Test trading for user flo."""
import urllib.request
import urllib.parse
import urllib.error
import json

BASE_URL = "http://localhost:8000/api"

def login(username, password):
    """Login and return access token."""
    data = urllib.parse.urlencode({
        "username": username,
        "password": password
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=data)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())["access_token"]

def trade(token, symbol, side, quantity):
    """Execute a trade."""
    data = json.dumps({
        "symbol": symbol,
        "side": side,
        "quantity": quantity
    }).encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(f"{BASE_URL}/trades", data=data, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        return {"success": True, "data": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        return {"success": False, "error": json.loads(e.read().decode())}

if __name__ == "__main__":
    print("Logging in as flo...")
    token = login("flo", "Alpine3Summit!")
    print(f"Token obtained: {token[:30]}...")

    print("\nTrying to BUY 5 AAPL...")
    result = trade(token, "AAPL", "buy", 5)
    print(f"Result: {json.dumps(result, indent=2)}")

    if result["success"]:
        print("\nTrying to SELL 2 AAPL...")
        result = trade(token, "AAPL", "sell", 2)
        print(f"Result: {json.dumps(result, indent=2)}")
