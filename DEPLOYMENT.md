# Deployment Instructions

## Backend (Render)

### Manual Configuration:
1. Go to https://dashboard.render.com
2. Find your service: `codeagent-wmko`
3. Go to Settings and update:

**Build & Deploy:**
- Root Directory: `server`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**Environment Variables:**
- `SUPABASE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcWJibWJpYW1pZGR2cndyYWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjI1NDAsImV4cCI6MjA2ODk5ODU0MH0.ZcSfg3FxNfcV76j5gHlHijggvyFcY0lKHGxv0Asx2wQ`
- `MISTRAL_API_KEY` = `nJvo1MlJBpPfIYRX1bEStNWKhkqR4nCr`

### Test URLs:
- Backend: https://codeagent-wmko.onrender.com/
- Health: https://codeagent-wmko.onrender.com/api/health

## Frontend (Netlify)

### Status: ✅ Deployed
- URL: https://codeagent.netlify.app
- Config: `code-concierge-nexus-main/netlify.toml`

## Troubleshooting

If backend returns 404:
1. Check Render logs
2. Verify Root Directory is set to `server`
3. Ensure environment variables are set
4. Wait for deployment to complete (2-3 minutes) 