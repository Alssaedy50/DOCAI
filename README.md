# DOCAI — ALSSAEDY CLINIC ERP

Arabic-first dental clinic ERP PWA for receipts, patients, inventory, expenses, reports and AI-assisted chat.

## AI provider configuration

AI provider keys are supported as **Vercel server-side environment variables**. The API endpoints check these variables first; if a provider variable is absent, a key entered in the website's AI settings can be used as a fallback.

In Vercel, open **Project → Settings → Environment Variables** and configure the providers you want to use:

- `GEMINI_API_KEY` — Google Gemini
- `GROQ_API_KEY` — Groq (also used for model-generated Arabic speech)
- `OPENROUTER_API_KEY` — OpenRouter

**Environment target matters:** Preview deployments only receive variables assigned to **Preview**; production deployments receive variables assigned to **Production**. After adding or changing a variable, redeploy the corresponding environment so the new deployment receives it. Never paste secret values into source files, GitHub, issue comments, or chat.

- Secret values are not returned by the API. The models endpoint reports configured provider names and models that passed a real response test, not the keys themselves.
- In the website, open **Settings → AI models** and press **فحص النماذج باستجابة فعلية** to test configured providers. This test sends provider requests and may consume quota.
- Only models returning a non-empty response are shown as successful. A passing test does not guarantee future uptime or quota.
- OpenRouter routes labelled `:free` may be free when available, but eligibility, limits, and availability vary. Gemini and Groq free quotas depend on the provider account and model.
- Browser-entered keys are a fallback, sent over HTTPS in request bodies and not intended to be saved in localStorage. Avoid entering keys on shared or untrusted devices.

## Voice

- **Phone/system voice** uses browser/device speech recognition and system text-to-speech voices.
- **Model-generated Arabic voice** uses Groq's Orpheus Arabic Saudi TTS endpoint. It uses `GROQ_API_KEY` from Vercel when configured, or the Groq key supplied in the settings request as a fallback. It may consume paid quota.
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

- `POST /api/ai` — text completion; uses Vercel provider keys first, then request-supplied keys as fallback.
- `POST /api/models` — live provider/model response tests; returns provider configuration status and only models that passed testing.
- `POST /api/tts` — model-generated Arabic speech using `GROQ_API_KEY` from Vercel first, then a request-supplied Groq key as fallback.

## Acceptance checklist before production

1. Confirm the intended Vercel environment has the correct variable names and targets; do not reveal or log secret values.
2. Redeploy after changing environment variables.
3. Run **فحص النماذج باستجابة فعلية** and confirm the intended providers return real responses.
4. Ask a general question and confirm no patient or finance context is attached.
5. Ask for a specific patient's balance; test an unknown patient and confirm other patient records are not sent.
6. Test a large report with more than 25 receipts or 40 stock items; verify batch coverage and totals.
7. Test PDF text, scanned PDF, images, DOCX, XLSX, CSV and text attachments, including oversized and unsupported files.
8. Test phone voice and model voice separately; test denied microphone permission, unsupported browser speech recognition, TTS quota failure and stopping the loop.
9. Export a backup, restore it into a test browser profile, and reconcile records, settings, inventory movements and financial totals.
10. Verify Arabic print/PDF on mobile and desktop, including multipage receipts and RTL alignment.
11. Confirm AI keys never appear in localStorage, exported backups, URLs or console logs.
12. Test on multiple devices and do not treat browser-local data as shared until a proper authenticated database/sync service is implemented.
13. Keep the pull request unmerged until these checks pass with test data.

## Deployment

The project uses a static HTML front end and Vercel Node serverless functions in `api/`. Redeploy the feature branch for preview tests. Do not merge to production before the acceptance checklist passes.
