# TwinCare AI
Educational personal health digital twin: Firebase auth, measurement tracking, charts, what-if simulation, Gemini assistant, resource explorer.
**Not medical advice. Does not diagnose.**

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env`, add `GEMINI_API_KEY` (never commit `.env`)
3. `node --env-file=.env server.js` then open http://localhost:3000

## Firebase
Create a project, enable Email/Password sign-in, add a Web app, paste its config into `public/index.html`.
Add your Render domain under Authentication > Settings > Authorized domains.

## Deploy (Render)
New Web Service from this repo. Build: `npm install`. Start: `npm start`. Env vars: `GEMINI_API_KEY`, optional `GEMINI_MODEL`.
