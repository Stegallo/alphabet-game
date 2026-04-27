# Sound App

Monorepo: Next.js frontend (Vercel) + FastAPI backend (Railway).

## Structure

```
frontend/   — Next.js + NextAuth (Google OAuth)
backend/    — FastAPI, stateless Google token verification
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- A Google OAuth 2.0 Client ID — see [Google Cloud Console setup](#google-cloud-console-setup)

---

## Running locally

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy and fill in the env file:

```bash
cp .env .env.local               # or edit .env directly
```

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins (default: `http://localhost:3000`) |

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`

---

### 2. Frontend

```bash
cd frontend
npm install
```

Copy and fill in the env file:

```bash
cp .env.local .env.local.bak     # .env.local is already the target file
```

Edit `frontend/.env.local`:

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Run `openssl rand -hex 32` and paste the output |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` | Same value as backend |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` for local dev |

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials**
3. **Create credentials** → **OAuth 2.0 Client ID** → Web application
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (prod)
5. Copy **Client ID** and **Client Secret** into both env files

---

## How auth works end-to-end

```
1. User clicks "Sign in with Google"
2. NextAuth redirects to Google → user approves
3. Google returns access_token to NextAuth
4. NextAuth stores it in an encrypted JWT cookie
5. Dashboard reads session → passes access_token to API calls
6. Frontend: GET /sounds/kick  Authorization: Bearer <access_token>
7. FastAPI calls Google's userinfo endpoint to verify the token
8. Valid → serve sound data. Invalid → 401.
```

No shared session state. FastAPI is fully stateless.

---

## Deployment

| Service | What |
|---|---|
| Vercel | Next.js frontend — add env vars in project settings |
| Railway | FastAPI backend — set `GOOGLE_CLIENT_ID` and `ALLOWED_ORIGINS` as env vars, start command: `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Update `NEXTAUTH_URL` and `ALLOWED_ORIGINS` to your production URLs before deploying.
