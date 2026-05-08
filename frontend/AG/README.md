# 🎧 Audiogram Analyzer — React Native App

A mobile hearing test app built with **React Native + Expo**, implementing the **Hughson-Westlake ascending method** for threshold determination.

**Prepared by:** Marya Ibrahim (4220203) · Leen Roumani (4210200)
**Supervised by:** Dr. Mouhib Alnoukari · Eng. Anas Abdulaziz

---

## 📁 Project Structure

```
AudiogramAnalyzer/
├── App.js                         ← Entry point + navigation + AuthProvider
├── app.json                       ← Expo config
├── package.json                   ← All dependencies
├── .env                           ← Default env config
├── .gitignore                     ← Protects secrets from git
└── src/
    ├── config/
    │   └── index.js               ← 🔧 ALL settings live here
    ├── api/                       ← 🌐 Backend communication layer
    │   ├── client.js              ← Axios + auth interceptors
    │   ├── authService.js         ← Login, register, logout
    │   ├── testService.js         ← Upload/fetch/delete tests
    │   ├── userService.js         ← User profile management
    │   └── index.js               ← Barrel export
    ├── context/
    │   └── AuthContext.js         ← Global login state
    ├── hooks/
    │   ├── useAuth.js             ← Auth hook
    │   └── useTests.js            ← Tests data hook
    ├── utils/
    │   ├── audioEngine.js         ← Tone generation + H-W algorithm
    │   ├── database.js            ← SQLite local storage
    │   └── syncService.js         ← Offline <-> Online sync
    ├── constants/
    │   └── theme.js               ← Colors, spacing, audiometry constants
    ├── components/
    │   └── AudiogramChart.js      ← SVG audiogram renderer
    └── screens/
        ├── HomeScreen.js
        ├── SelectEarScreen.js
        ├── TestScreen.js
        ├── HistoryScreen.js
        └── AboutScreen.js
```

---

## 🚀 Installation

```bash
# 1. Install Node.js from https://nodejs.org (LTS)
npm install -g expo-cli

# 2. Install dependencies
cd AudiogramAnalyzer
npm install

# 3. Start
npx expo start
```

Scan the QR code with the Expo Go app on your phone.

---

## 🌐 Connecting to Your Backend

### Step 1 — Set your API URL

Open `src/config/index.js` and change one line:

```js
baseURL: 'https://your-backend.com/api/v1',
```

Everything else (auth headers, error handling, sync) works automatically.

### Step 2 — Choose App Mode

```js
appMode: 'hybrid',  // 'offline' | 'online' | 'hybrid'
```

| Mode     | Behaviour                                               |
|----------|---------------------------------------------------------|
| offline  | SQLite only — no API calls ever                         |
| online   | API only — needs internet                               |
| hybrid   | Save locally first, sync to API in background (recommended) |

### Step 3 — API Endpoints Expected

**Auth (`src/api/authService.js`)**

| Method | Endpoint           | Body                        | Returns                     |
|--------|--------------------|-----------------------------|-----------------------------|
| POST   | /auth/register     | { name, email, password }   | { token, refreshToken, user }|
| POST   | /auth/login        | { email, password }         | { token, refreshToken, user }|
| POST   | /auth/logout       | —                           | 200 OK                      |
| GET    | /auth/me           | —                           | { user }                    |
| POST   | /auth/refresh      | { refreshToken }            | { token }                   |

**Tests (`src/api/testService.js`)**

| Method | Endpoint           | Body / Params                                           | Returns                     |
|--------|--------------------|---------------------------------------------------------|-----------------------------|
| POST   | /tests             | { ear, thresholds, avg_threshold, hearing_level, tested_at } | { test }               |
| GET    | /tests             | ?page=1&limit=20                                        | { tests, total, page }      |
| GET    | /tests/:id         | —                                                       | { test }                    |
| DELETE | /tests/:id         | —                                                       | 204 No Content              |
| GET    | /tests/trends      | ?ear=left                                               | { trends }                  |

The `thresholds` field is a JSON object like:
```json
{ "250": 20, "500": 25, "1000": 30, "2000": 35, "4000": 50, "8000": 65 }
```

**Users (`src/api/userService.js`)**

| Method | Endpoint                    | Body                              |
|--------|-----------------------------|-----------------------------------|
| GET    | /users/me                   | —                                 |
| PATCH  | /users/me                   | { name?, dateOfBirth?, gender? }  |
| POST   | /users/me/change-password   | { current_password, new_password }|
| DELETE | /users/me                   | —                                 |

### Step 4 — Auth Token Flow

Handled automatically — you never need to add headers manually:
1. Login/register → token saved in encrypted device storage
2. Every request → interceptor adds `Authorization: Bearer <token>`
3. 401 response → tokens cleared, user needs to re-login

### Step 5 — Add a New API Call

```js
// In src/api/testService.js, add:
exportPDF: async (testId) => {
  const response = await apiClient.get(`/tests/${testId}/export-pdf`);
  return response.data;
},
```

Then call it anywhere:
```js
import { TestService } from '../api';
const pdf = await TestService.exportPDF(testId);
```

### Step 6 — Toggle Features

```js
// src/config/index.js
features: {
  cloudSync:         true,
  userAuth:          true,
  aiRecommendations: false,  // flip to true when backend is ready
  exportPDF:         false,
},
```

Check a flag before calling:
```js
import Config from '../config';
if (Config.features.aiRecommendations) {
  await TestService.getRecommendations(testId);
}
```

---

## ✏️ Common Edits

| What to change             | Where                                    |
|----------------------------|------------------------------------------|
| Backend URL                | `src/config/index.js` → api.baseURL      |
| App mode (offline/online)  | `src/config/index.js` → appMode          |
| New API endpoint           | `src/api/testService.js`                 |
| Colors / theme             | `src/constants/theme.js`                 |
| Frequencies tested         | `src/constants/theme.js` → FREQUENCIES   |
| H-W step sizes             | `src/utils/audioEngine.js`               |
| New screen                 | `src/screens/` + `App.js` Stack          |

---

## ⚠️ Disclaimer

For educational and awareness purposes only.
Not a substitute for professional clinical audiometry.
