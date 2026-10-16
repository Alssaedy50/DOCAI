# DOCAI — ALSSAEDY CLINIC ERP

Arabic-first dental-clinic PWA for receipts, patient debts, inventory, expenses, financial summaries, backups and AI-assisted workflows.

## AI keys: enter them in the website settings

No Vercel environment variables are required for the text-model API keys in this version. Open **Settings → AI models**, enter one or more provider keys, then click **فحص النماذج باستجابة فعلية**.

- **Gemini:** supports text and image input for models that pass the live check.
- **Groq:** text models can be tested; its Arabic model-generated speech is a separate provider service and may be billed.
- **OpenRouter:** free routes are marked as free routes, but availability and quotas can change.
- A model appears in the selector only after a small real completion request returns non-empty text. The AI workflow refuses to use a model that has not passed the current session's live check. Changing a key clears the tested list.
- The test consumes a small amount of provider quota. Avoid repeatedly running it.
- Free access is not guaranteed for every account, region, model, or time. Check the provider dashboard for current daily/minute/token limits and prices.

### Key handling

Keys are typed into password fields and sent over HTTPS in the request to this app's serverless endpoint. This implementation does not intentionally save provider keys to `localStorage`, backups, or cloud backups; a refresh clears the fields. Keys remain in the active page until cleared or the page is refreshed. Use **مسح مفاتيح AI من الجلسة** before leaving a shared device. Do not use the app on a device you do not trust. Provider requests are sent to the chosen provider; do not send patient identifiers unless necessary and permitted by your clinic's policies.

The app server does not keep a provider key between requests. The browser supplies the key for each AI, model-test, or model-voice request. Endpoints are not a substitute for user authentication or a production access-control layer.

## Topic-scoped clinic context

The AI workflow does not attach the full clinic database to every prompt. It selects relevant records based on the question topic, limits the number of records included, uses exact matching for patient-specific requests, and avoids sending other patients' records when a requested patient is not found. Large audit requests are split into bounded batches. Currency differences and missing data should be called out instead of guessed.

Use the minimum patient details needed to answer. AI-generated text is advisory; verify all amounts and patient information against the original record before making clinical or financial decisions.

## Chat attachments

Supported in the chat: PNG/JPEG/WebP/GIF images (Gemini key required), text-based PDF (extracts up to 12 pages), TXT, MD, CSV, JSON and LOG files. Maximum 5 files per message; image size is limited to about 2.5 MB and other files to 4 MB. Image analysis requires a model that passed the live check and a Gemini key. Scanned PDFs without a text layer are not OCR'd in this version; save/export their text or attach a readable image instead. DOCX/XLSX files are not currently parsed in the chat.

## Voice

- **Phone/system voice:** uses browser speech recognition and the device/browser's built-in speech synthesis.
- **Model voice:** sends answer segments to Groq's Arabic TTS endpoint using the Groq key entered in settings. This may incur separate usage charges.
- The hands-free workflow is turn-based (listen → transcribe → request response → play answer → listen again), not a full-duplex real-time audio call. Microphone permission and browser speech support are required.

## Encrypted cloud backup

The Settings screen supports JSONBin backup and restore. The JSONBin key is used from the visible password field and is not stored in local storage. Before upload, the clinic data is encrypted in the browser using AES-GCM with a password-derived key (PBKDF2). The passphrase is never sent to JSONBin and cannot be recovered if lost. Keep the JSONBin key, Bin ID and encryption passphrase safe. Restore creates a local JSON backup before replacing browser data.

Cloud backup stores encrypted data at a third-party service; protect the JSONBin key and encryption passphrase. Confirm your clinic's privacy/legal requirements before using any external cloud service.

## Data and release limitations

- Patient, receipt, inventory and expense records still primarily live in this browser's `localStorage`; they are not a shared server database and are not automatically synchronized between devices.
- The app has local JSON backup/restore and encrypted manual cloud backup. Always maintain an offline backup and test restores with dummy data.
- Receipt/inventory changes have validation and a stock movement log, but accounting policies, inventory quantities and existing legacy data need reconciliation by the clinic before production use.
- No clinical diagnosis or treatment decision should rely solely on AI output.
- This is a test branch, not a certified clinical or accounting system. Do not merge to production until browser/mobile acceptance checks pass with dummy data.

## Automated checks

The GitHub Actions workflow runs Node syntax checks on serverless endpoints and the client script, parses the inline script, and checks for required UI handlers and key controls.

## Manual acceptance checklist

1. Enter a valid key in Settings; test model discovery; confirm only successful models are listed.
2. Change a key; confirm the old tested list is cleared; run the test again.
3. Ask a general question; verify no clinic records are attached.
4. Ask for a specific patient by name/phone; verify only exact matching records are included; try an unknown patient and confirm other patients' data is not sent.
5. Test inventory/expense audit and a large report; reconcile results against source records.
6. Test image, text PDF, TXT/CSV and unsupported attachment behavior.
7. Test phone speech and model-generated speech separately, including denied microphone permission, missing keys, quota errors, and stop/restart.
8. Create a dummy receipt, edit services, delete it, and confirm stock movement and quantity reconcile.
9. Export a JSON backup, restore it into a test profile, and reconcile record counts/totals.
10. Test encrypted JSONBin upload/restore with dummy data and a wrong passphrase; verify no provider/cloud keys appear in localStorage or exported backup.
11. Verify Arabic A5/thermal print and PDF/image export on mobile and desktop.
12. Check browser console/network errors before considering production.

## Deployment

Vercel uses the static HTML entry point and the `api/` Node serverless functions. No provider API key environment variables are required for this settings-driven flow. The current branch is `feat/clinic-erp-hardening`; keep it separate from `main` until the acceptance checklist passes.
