# Audiogram Analyzer — API Reference

Base URL: `http://localhost:8000`

All endpoints except `/api/auth/login/` and `/api/users/register/` require:
```
Authorization: Bearer <access_token>
```

---

## Authentication

### POST /api/auth/login/
Login and get JWT tokens.

**Request:**
```json
{ "username": "john", "password": "secret" }
```
**Response:**
```json
{ "access": "<token>", "refresh": "<token>" }
```

---

### POST /api/auth/refresh/
Refresh access token.

**Request:**
```json
{ "refresh": "<refresh_token>" }
```
**Response:**
```json
{ "access": "<new_token>" }
```

---

## Users

### POST /api/users/register/
Register a new user. No auth required.

**Request:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "secret123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "patient",
  "date_of_birth": "1990-05-20",
  "phone_number": "05xxxxxxxx"
}
```
- `role`: `"patient"` or `"audiologist"`

**Response:** `201`
```json
{
  "id": 1,
  "username": "john",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "patient",
  "date_of_birth": "1990-05-20",
  "phone_number": "05xxxxxxxx"
}
```

---

### GET /api/users/me/
Get current logged-in user profile.

**Response:** `200` — same as register response

---

### PUT /api/users/me/
Update current user profile (partial update allowed).

**Request:** any fields from register (except password)

---

### GET /api/users/{user_id}/
Get user by ID. Patients can only view themselves. Audiologists can view any patient.

---

### DELETE /api/users/{user_id}/
Delete user. Same permission rules as GET.

---

## Audio Sessions

### POST /api/audio/sessions/
Create a new test session.

**Request:**
```json
{
  "ear": "R",
  "session_type": "air",
  "strategy_type": "traditional",
  "notes": ""
}
```
- `ear`: `"R"` (right) or `"L"` (left)
- `session_type`: `"air"` or `"bone"`
- `strategy_type`: `"traditional"` or `"gpc"`

**Response:** `201`
```json
{
  "id": 1,
  "patient": 1,
  "ear": "R",
  "session_type": "air",
  "status": "active",
  "strategy_type": "traditional",
  "notes": "",
  "created_at": "2026-04-16T10:00:00Z",
  "results": [
    { "id": 1, "frequency": 250, "threshold_db": null, "current_db": 40.0, "is_completed": false },
    { "id": 2, "frequency": 500, "threshold_db": null, "current_db": 40.0, "is_completed": false }
  ],
  "classification": null
}
```

---

### GET /api/audio/sessions/{session_id}/
Get session details with all results.

---

### POST /api/audio/sessions/{session_id}/respond/
Record patient response (heard or not heard). The backend moves through frequencies automatically.

**Request:**
```json
{ "heard": true }
```

**Response (in progress):**
```json
{
  "is_complete": false,
  "current_db": 30.0,
  "frequency": 1000,
  "ear": "R",
  "session_type": "air",
  "next_frequency": 1000,
  "session_complete": false
}
```

**Response (frequency done):**
```json
{
  "is_complete": true,
  "threshold": 40.0,
  "current_db": 40.0,
  "frequency": 1000,
  "next_frequency": 2000,
  "session_complete": false
}
```

**Response (all done):**
```json
{
  "is_complete": true,
  "threshold": 35.0,
  "frequency": 250,
  "next_frequency": null,
  "session_complete": true
}
```

---

### POST /api/audio/sessions/{session_id}/next-step/
Alias for `/respond/` — same request/response format.

---

### GET /api/audio/sessions/{session_id}/classify/
Get hearing classification after session is complete.

**Response:**
```json
{
  "pta": 45.0,
  "classification": "Moderate",
  "classification_ar": "متوسط",
  "thresholds": { "500": 40, "1000": 45, "2000": 50, "4000": 55 },
  "needs_bone_conduction": true,
  "disclaimer": "هذا تقييم أولي وليس تشخيصاً طبياً"
}
```

---

### GET /api/audio/sessions/{session_id}/audiogram/
Get audiogram chart data (ready for frontend rendering).

**Response:**
```json
{
  "ear": "R",
  "ear_label": "الأذن اليمنى",
  "points": [
    { "frequency": 500, "threshold_db": 40, "symbol": "O", "color": "#FF0000" }
  ],
  "pta": 45.0,
  "hearing_zone": { "label": "Moderate", "label_ar": "متوسط", "min": 41, "max": 55 },
  "x_axis": { "label": "Frequency (Hz)", "values": [250, 500, 1000, 2000, 4000, 8000] },
  "y_axis": { "label": "Hearing Level (dB HL)", "min": -10, "max": 120, "inverted": true },
  "zones": [...]
}
```

---

### POST /api/audio/generate-tone/
Generate a pure tone WAV file as base64.

**Request:**
```json
{
  "frequency": 1000,
  "db_hl": 40,
  "duration": 1.0,
  "ear": "R"
}
```
- `frequency`: one of `[250, 500, 1000, 2000, 4000, 8000]`
- `db_hl`: `-10` to `120`
- `duration`: `0.5` to `3.0` seconds

**Response:**
```json
{
  "audio": "<base64-encoded-wav>",
  "format": "wav",
  "frequency": 1000,
  "db_hl": 40,
  "ear": "R"
}
```

---

### GET /api/audio/users/{user_id}/history/
Get all sessions for a user. Patients can only see their own history.

**Response:** array of session objects (same as GET session)

---

## Error Responses

All errors follow this format:
```json
{ "error": "وصف الخطأ" }
```

| Code | Meaning |
|------|---------|
| 400  | Bad request / validation error |
| 401  | Not authenticated |
| 403  | Not authorized |
| 404  | Resource not found |
