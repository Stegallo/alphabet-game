# Sound app — full stack guide

## Project structure

```
my-sound-app/
├── frontend/                  # Next.js — Vercel
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts      # NextAuth handler
│   │   ├── page.tsx                  # Home (public)
│   │   └── dashboard/
│   │       └── page.tsx              # Protected sound UI
│   ├── lib/
│   │   └── api.ts                    # Calls to FastAPI backend
│   ├── .env.local
│   └── next.config.ts
│
└── backend/                   # FastAPI — Railway / Render
    ├── main.py
    ├── auth.py                        # JWT verification
    ├── routers/
    │   └── sounds.py                  # Sound endpoints
    ├── .env
    └── requirements.txt
```

---

## Frontend — Next.js

### 1. Install

```bash
npx create-next-app@latest frontend --typescript --app
cd frontend
npm install next-auth
```

### 2. `.env.local`

```env
NEXTAUTH_SECRET=your-random-secret-here   # openssl rand -hex 32
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. NextAuth route — `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // JWT is the default — no database needed
  session: { strategy: "jwt" },

  callbacks: {
    // Forward the JWT token so the frontend can send it to FastAPI
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
    async jwt({ token, account }) {
      if (account) token.accessToken = account.access_token;
      return token;
    },
  },
});

export { handler as GET, handler as POST };
```

### 4. Protect a page — `app/dashboard/page.tsx`

```typescript
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getServerSession();
  if (!session) redirect("/");          // not logged in → home

  return <SoundBoard session={session} />;
}
```

### 5. Call FastAPI — `lib/api.ts`

```typescript
const API = process.env.NEXT_PUBLIC_API_URL;

export async function playSound(soundId: string, accessToken: string) {
  const res = await fetch(`${API}/sounds/${soundId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Sound request failed");
  return res.json();
}
```

---

## Backend — FastAPI

### 1. Install

```bash
pip install fastapi uvicorn python-jose[cryptography] httpx python-dotenv
```

### 2. `.env`

```env
GOOGLE_CLIENT_ID=...   # same as frontend — used to verify tokens
```

### 3. JWT verification — `auth.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

bearer = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    token = credentials.credentials
    # Verify the Google access token by calling Google's userinfo endpoint
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return resp.json()   # {"email": "...", "name": "...", ...}
```

### 4. Sound router — `routers/sounds.py`

```python
from fastapi import APIRouter, Depends
from auth import get_current_user

router = APIRouter(prefix="/sounds", tags=["sounds"])

@router.get("/{sound_id}")
async def get_sound(sound_id: str, user=Depends(get_current_user)):
    # user is already verified — do your sound generation here
    return {
        "sound_id": sound_id,
        "url": f"https://your-cdn.com/sounds/{sound_id}.mp3",
        "requested_by": user["email"],
    }
```

### 5. Main app — `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import sounds

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sounds.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## Deployment

| Service | What | Free tier |
|---|---|---|
| Vercel | Next.js frontend | Yes — no cold starts |
| Railway | FastAPI backend | Yes — but sleeps after inactivity |
| Render | FastAPI backend | Yes — sleeps on free tier |

> For the backend, Railway's $5/mo Hobby plan keeps it always-on.
> That's worth it once the app is real — cold starts on free tiers add 10-30s delay.

---

## How auth flows end-to-end

```
1. User clicks "Sign in with Google" on Next.js
2. NextAuth redirects to Google → user approves
3. Google returns access_token to NextAuth
4. NextAuth stores it in an encrypted JWT cookie (handled automatically)
5. Dashboard page reads session — has access_token
6. Frontend sends: GET /sounds/123  Authorization: Bearer <access_token>
7. FastAPI calls Google's userinfo endpoint to verify the token
8. If valid → serve the sound. If not → 401.
```

No shared session state. No SECRET_KEY bugs. FastAPI is fully stateless.

---

## Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (prod)
5. Copy Client ID and Client Secret into both `.env` files
