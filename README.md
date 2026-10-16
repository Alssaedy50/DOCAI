# DOCAI — ALSSAEDY CLINIC ERP

Arabic-first dental-clinic receipt, inventory, expense and AI-assistant PWA.

## AI model selection (live checks)

The app does **not** treat a model name in a static list as proof that it works. Open **Settings → AI models → “فحص النماذج الآن”**. The server sends a small real completion request to each configured candidate and the UI lists only candidates that return a non-empty response at test time. A passing test is a point-in-time result, not a promise of future uptime or quota.

- **Gemini / Groq:** access and free-tier quotas depend on the provider account, selected model and current limits. Check the provider console for the exact quota.
- **OpenRouter free models:** the model route is free where marked, but request limits and availability may change by account/plan.
- Automatic mode tries configured providers and fails over when a provider call fails. The local offline option is a limited heuristic, **not** a real language model.
- The test sends a tiny prompt and consumes a small amount of provider quota. Do not refresh the test repeatedly without need.
- The browser does not store provider API keys. Configure them as server-side Vercel Environment Variables.

## Required Vercel Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**, then redeploy:

- `CLINIC_APP_PASSWORD`: a strong password used to authenticate the AI endpoints.
- `SESSION_SECRET`: a random secret of at least 32 characters. Generate one in Termux with `openssl rand -base64 48`; do not reuse an API key.
- At least one text provider key: `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY`.
- `GROQ_API_KEY` is required for generated Arabic model speech. The Groq Orpheus Arabic Saudi TTS model is a separately priced service; it is not the same as the phone's built-in speech synthesis.

Never paste these keys into `index.html`, JavaScript shipped to the browser, screenshots, or chat messages.

## Voice modes

- **Phone/system voice:** browser Speech Recognition plus the device/browser's built-in Speech Synthesis. Voice availability and quality depend on the device and browser.
- **Model-generated voice:** the text response is sent to the authenticated `/api/tts` endpoint, which uses Groq's Arabic TTS. This can incur usage charges.
- The hands-free UI is turn-based (listen → transcribe → request AI → play answer → listen again). It is **not** a full-duplex, low-latency speech-to-speech session. Browser support and microphone permission are required.

## Context and privacy

The client selects context based on the request topic instead of attaching every receipt, patient, inventory item and expense to every prompt. Patient-specific requests use matching records; unmatched patient queries must not send other patients' records. Large “all records” audits are summarized in bounded batches. Currency mixing and missing fields must be called out rather than silently assumed.

The PWA's business records still use browser `localStorage` in this codebase. JSON backup files contain sensitive patient/financial information and must be protected. This is not yet a multi-user server-side database, and local browser data is not automatically synced across devices. Do not use this as the sole official clinical/financial record until browser testing, restore tests, access-control review, accounting reconciliation, and deployment checks are completed.

## Current serverless endpoints

- `/api/login` — creates an HttpOnly, Secure, SameSite session cookie.
- `/api/ai` — authenticated text completion with server-side provider keys.
- `/api/models` — authenticated live model-response tests; only successful candidates are returned.
- `/api/tts` — authenticated Arabic model-generated speech.

## Pre-release test checklist

1. Configure environment variables and redeploy.
2. Open Settings and explicitly run model discovery; confirm only successful tests appear.
3. Ask a general question and confirm no clinic records are attached.
4. Ask for a specific patient's balance and confirm only exact matched records are used; try an unknown patient and confirm other patient records are not sent.
5. Run a report with more than 25 receipts / 40 inventory items and confirm batch counts and totals.
6. Test both phone voice and model voice, including denied microphone permission, unavailable speech recognition, TTS quota errors, and stopping the voice loop.
7. Export a JSON backup, clear a test dataset, restore it, and reconcile counts and totals.
8. Verify Arabic print/PDF output on mobile and desktop; verify receipt and stock changes reconcile.
9. Inspect browser console/network logs; confirm no provider API key is present in browser storage or requests.
10. Do not merge to production until these checks pass with test data.

## Deploy

Vercel automatically detects the `api/` serverless functions. Redeploy the branch after setting environment variables. The app currently has no build step or package manifest; use the default static deployment plus Vercel Node functions.
