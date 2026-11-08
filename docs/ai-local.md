# Local AI Setup and Review

## Run Without Paid APIs
Install the free Ollama runtime from https://ollama.com/download. No account or API key is needed. Start the project-specific service with `npm run ai:start`. In another terminal run `ollama pull qwen3:4b` (or `.local/ollama/ollama pull qwen3:4b` if using the downloaded project runtime). Then start the app. Keep the AI terminal running while using the inbox.

The service binds to 127.0.0.1:11434. `OLLAMA_NO_CLOUD=1` disables cloud functionality. The application uses a fixed local model name and endpoint; guest text cannot choose a provider or execute tools. The model is downloaded once into ignored `.local/ollama/models`. Allow several GB of disk space and sufficient RAM alongside Docker and the app.

## Workflow
Sign in as reservations, open Enquiry inbox, select a sample and click Classify & draft with AI. The original text is saved before processing. Classification and source extraction are separate calls; a third call drafts a reply from the validated category. Only exact source substrings are accepted as extracted facts. The original remains visible. Confirm any incomplete dates with the guest.

For room quotes, enter guest-confirmed dates and counts in Check an accommodation quote. The app reads the actual rate table, calculates taxes and availability, then lets staff append the checked result. AI never calculates prices.

## Mistakes and Failure
Uncertain or suspicious enquiries go to GM review. Invalid output and unavailable/slow model calls move an enquiry to the manual lane with retry available. This fallback is not represented as successful AI. Staff can correct routing and compose a reply. Explicit complaints remain flagged. Version checking discards results computed before a staff edit. Sending is always staff-approved and simulated.

## Evaluation
`npm run test:ai` calls the actual local model on synthetic samples. Unit tests use isolated stubs only to test malformed replies and transport failures; they are not evidence of model accuracy. The original smaller model failed some live sample checks, so model selection and prompts were revised. See evidence.md for final observed results and limits.

## Limitations
A few passing examples are not a general accuracy benchmark. Source matching establishes that text was copied, not that the model understood it. The confidence threshold is a demo assumption and model confidence is not calibrated. Suspicious-instruction detection is a conservative extra check, not a complete prompt-injection detector. Staff must review every draft. The app does not continuously run an inbox worker: staff explicitly start AI processing on a saved enquiry.

## Model and API References
The selected Qwen3 4B model is distributed under Apache 2.0: https://ollama.com/library/qwen3:4b . Calls use Ollama's structured JSON chat API: https://docs.ollama.com/api/chat . The application explicitly disables thinking output and uses bounded context and output sizes. No automatic cloud fallback is configured.
