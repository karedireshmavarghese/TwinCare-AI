# TwinCare AI

AI-powered personal health digital twin. Track blood pressure, heart rate and glucose, view trends, simulate what-if scenarios, and learn with a Gemini health-education assistant.

**Live website:** https://twincare-ai-3.onrender.com

> Educational use only. TwinCare AI does not diagnose conditions and does not replace a doctor. Simulations are hypothetical, not medical predictions.

## Features
- Firebase email/password sign-in, per-user dashboards, logout
- Health tracking: blood pressure, heart rate, glucose, history table, interactive charts
- Synthetic demo data, clearly labeled "Demo"
- What-if simulation compared with your recent readings
- Gemini AI assistant (API key stays on the server)
- Resource Explorer with links to WHO, CDC, NHS and MedlinePlus

## Tech stack
HTML, CSS, JavaScript, Chart.js, Firebase Authentication, Node.js, Express, Google Gemini API, Render, GitHub

## Project structure
```
public/index.html   frontend (dashboard)
server.js           Express server and /api/resources
gemini-route.js     /api/chat (Gemini)
package.json
.env.example
```

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY` (never commit `.env`)
3. `node --env-file=.env server.js`
4. Open https://twincare-ai.onrender.com

## Firebase setup
Create a Firebase project, enable Email/Password sign-in, add a Web app, and paste its config into `public/index.html`. Add your Render domain under Authentication > Settings > Authorized domains.

## Deploy on Render
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables: `GEMINI_API_KEY`, optional `GEMINI_MODEL` (default `gemini-2.5-flash`)

## License
MIT
