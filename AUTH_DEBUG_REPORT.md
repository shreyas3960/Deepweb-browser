# Google Auth Loop - Debug Report & Fixes

## Executive Summary

The authentication system has a critical flaw that prevents users from staying logged in after Google OAuth login. Users are immediately redirected back to the login page, creating an infinite loop.

## Detailed Analysis of Issues

### Issue #1: Missing OAuth Callback Handler
**Location:** Frontend routing
**Problem:** No endpoint captures the `session_id` returned by Emergent Auth after successful Google login
**Impact:** Session ID is lost immediately after OAuth redirect

**Current Flow (Broken):**
```
User clicks Login → Redirects to Emergent Auth → User logs in with Google 
→ Emergent Auth redirects to app with session_id → NO HANDLER → Session is lost
```

**How to Fix:**
1. Create new component: `frontend/src/pages/AuthCallback.jsx`
2. Add route in App.js: `<Route path="/auth/callback" element={<AuthCallback />}`
3. Capture URL params: `const sessionId = new URLSearchParams(window.location.search).get('session_id')`
4. Call backend to exchange session_id for token

### Issue #2: Backend Not Returning Session Token
**Location:** `backend/server.py`, line 257-259, `create_session` endpoint
**Problem:** Session created in DB but token not returned in response body
**Impact:** Frontend has no way to retrieve and store the token

**Current Code (Line 257):**
```python
return {"user": user, "session_token": session_token}
```

**Issue:** Response structure not consistent with what frontend expects

**Fix Required:**
Ensure endpoint returns both user AND token clearly:
```python
return {
    "success": True,
    "user": user,
    "session_token": session_token
}
```

### Issue #3: Frontend Auth Check Logic Broken
**Location:** `frontend/src/hooks/useAuth.js`, lines 20-54
**Problem 1:** `checkAuth()` expects `response.data` but backend returns user object directly
**Problem 2:** No `withCredentials: true` flag for cookie-based auth
**Problem 3:** Authorization header not persisted across requests

**Current Code (Lines 30-34):**
```javascript
const response = await axios.get(`${API}/auth/me`, {
  withCredentials: true
});

if (response.data) {
  setUser(response.data);
}
```

**Issue:** `response.data` might be `undefined`, should check `response` directly

**Fix:**
```javascript
const response = await axios.get(`${API}/auth/me`, {
  withCredentials: true
});

if (response && response.data) {
  setUser(response.data);
  // Ensure token is in localStorage
  const token = localStorage.getItem('session_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
} else {
  setUser(null);
  localStorage.removeItem('session_token');
}
```

### Issue #4: No Token Persistence After OAuth
**Location:** `frontend/src/hooks/useAuth.js`, `setSession` function
**Problem:** After OAuth login, `setSession()` is never called to store token
**Impact:** Token not in localStorage → App reload loses session

**Current Code (Missing After OAuth):**
No code exists to save token after OAuth callback

**Fix:** Add in AuthCallback component:
```javascript
const sessionId = new URLSearchParams(window.location.search).get('session_id');
if (sessionId) {
  const response = await axios.post(`${API}/auth/session`, {
    session_id: sessionId
  });
  
  if (response.data && response.data.session_token) {
    localStorage.setItem('session_token', response.data.session_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.session_token}`;
  }
}
```

### Issue #5: Missing Credentials Configuration
**Location:** Both frontend and backend
**Problem:** CORS credentials not properly configured
**Impact:** Cookies won't be sent/received properly

**Frontend Fix in useAuth.js:**
```javascript
// Set axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';
```

**Backend Fix in server.py (already exists but verify):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,  # CRITICAL
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Complete Fix Implementation Order

1. **CREATE:** `frontend/src/pages/AuthCallback.jsx` - Handle OAuth callback
2. **UPDATE:** `frontend/src/App.js` - Add callback route
3. **UPDATE:** `frontend/src/hooks/useAuth.js` - Fix auth logic
4. **UPDATE:** `backend/server.py` - Verify session endpoint
5. **VERIFY:** Environment variables set correctly

## Testing Checklist

- [ ] Click "Login with Google"
- [ ] User redirected to Emergent Auth
- [ ] User completes Google auth
- [ ] Session ID captured in callback
- [ ] Token exchanged and stored
- [ ] User redirected to dashboard (not login)
- [ ] Page refresh maintains session
- [ ] Logout works correctly
- [ ] Log out then login again works

## Related Issue

See Issue #1 for full description
