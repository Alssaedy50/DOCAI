# DOCAI — ALSSAEDY CLINIC ERP

Arabic-first dental clinic ERP PWA for receipts, patients, inventory, expenses, reports and AI-assisted chat.

## AI keys are entered in the website settings

No provider API key needs to be added to Vercel environment variables. At the start of a test session, open **Settings → AI models**, paste the API keys into the corresponding password fields, and press **فحص النماذج باستجابة فعلية**.

- Keys are held in the current page session only and are not intentionally written to localStorage. Reloading the page clears them; enter them again for a new session.
- The keys are sent over HTTPS to this app's serverless endpoints for a request, then forwarded to the selected provider. Do not enter keys on a shared or untrusted device.
- The browser UI only lists models that return a real non-empty response to the test prompt. A passing test is not a guarantee of future uptime or quota.
- Testing consumes provider requests. Repeated tests may use up free quotas.
- OpenRouter routes labelled `:free` can be free when available, but limits, eligibility, and availability vary. Gemini and Groq free quotas depend on the provider account and model.
- **Never merge any code that stores provider keys in browser storage.** The current UI save handler clears AI provider keys from persisted settings.

## Voice

- **Phone/system voice** uses the browser/device speech recognition and system text-to-speech voices.
- **Model-generated Arabic voice** uses Groq's Orpheus Arabic Saudi TTS endpoint and needs the Groq key entered in the page settings. It may consume paid quota.
- The current hands-free mode is turn-based: listen → transcribe → send prompt → play answer → listen again. It is not full-duplex real-time voice.
- Microphone access and browser speech recognition support are required. The browser may use device or browser services for speech recognition.

## Relevant context and attachments

The AI assistant selects topic-relevant records rather than attaching every patient, receipt, inventory item and expense to every question. Patient-specific queries with no exact match should not send other patients' records. Larger report requests are summarized in bounded batches.

Chat attachment support includes text-based PDF extraction, image input for compatible Gemini models, and parsing common office documents when the relevant browser libraries load. Scanned PDFs may need image-capable Gemini analysis. Unsupported formats, oversized files, quota failures and missing extraction text should be reported rather than silently treated as analyzed.

Do not send medical records to an external AI provider unless the clinic has assessed consent, privacy, retention, and applicable legal obligations. Keep prompts scoped and remove unnecessary identifiers.

## Data and backup

- Clinic business data in this codebase remains primarily in browser localStorage. It is not a shared multi-device database and can be lost if browser storage is cleared.
- JSON backup files contain sensitive patient and financial records. Store them securely and test restoring a copy before relying on them.
- This app is not yet a validated medical record or accounting system. Reconcile all balances, receipt numbering, stock movements, print layouts, and restore behaviour with test data before clinical/financial production use.

## API endpoints

- `POST /api/ai` — text completion; accepts provider keys from the current settings session.
- `POST /api/models` — live provider/model response tests; returns only successful models.
- `POST /api/tts` — model-generated Arabic speech using `GROQ_API_KEY` from Vercel, or the Groq key supplied in the settings request.

## Vercel environment variables (recommended)

Configure these in **Vercel → Project → Settings → Environment Variables**, for Preview and Production as needed, then redeploy:

- `GEMINI_API_KEY` — optional Google Gemini key
- `GROQ_API_KEY` — optional Groq key (also used for generated Arabic speech)
- `OPENROUTER_API_KEY` — optional OpenRouter key

Add only the providers you intend to use. Server-side Vercel values take priority over keys entered in the browser. The API never returns secret values to the browser; it only reports which providers are configured and which models passed a live response test. The settings fields remain as a fallback for preview testing. Browser-entered keys are sent over HTTPS in request bodies and are not intended to be persisted in localStorage; avoid shared/untrusted devices and do not log request bodies.

## Acceptance checklist before production

1. Enter each provider key in settings and verify only models returning a response appear.
2. Ask a general question and confirm no patient or finance context is attached.
3. Ask for a specific patient's balance; test an unknown patient and confirm other patient records are not sent.
4. Test a large report with more than 25 receipts or 40 stock items; verify batch coverage and totals.
5. Test PDF text, scanned PDF, images, DOCX, XLSX, CSV and text attachments, including oversized and unsupported files.
6. Test phone voice and model voice separately; test denied microphone permission, unsupported browser speech recognition, TTS quota failure and stopping the loop.
7. Export a backup, restore it into a test browser profile, and reconcile records, settings, inventory movements and financial totals.
8. Verify Arabic print/PDF on mobile and desktop, including multipage receipts and RTL alignment.
9. Confirm AI keys never appear in localStorage, exported backups, URLs or console logs.
10. Test on multiple devices and do not treat browser-local data as shared until a proper authenticated database/sync service is implemented.
11. Keep the pull request unmerged until these checks pass with test data.

## Deployment

The project uses a static HTML front end and Vercel Node serverless functions in `api/`. Redeploy the feature branch for preview tests. Do not merge to production before the acceptance checklist passes.
