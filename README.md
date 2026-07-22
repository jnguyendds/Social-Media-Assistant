# Signal — AI Content Optimizer

Signal turns an existing photo or video into platform-ready social content. It is not a photography coach and must never tell a user to reshoot, move the subject, use another angle, or recreate the scene.

## Product principle

**The uploaded file is the source material. Signal improves that file and presents finished options for the user to choose from.**

The analysis remains behind the scenes. Users should primarily see completed edit choices, not a critique or a list of work they need to perform.

## Current workflow

1. Upload a photo or video.
2. Select Instagram, TikTok, or both.
3. Signal analyzes the media with Anthropic.
4. Signal creates local crop/color versions and a precise generative-editing package.
5. For generative image cleanup, the user hands the image and instructions to ChatGPT, then imports the result back into Signal.
6. Signal prepares the selected result for export.

The ChatGPT handoff keeps generative editing available without requiring Signal to pay for an image-editing API. A future paid provider can be added behind the same edit-package contract.

## Signal V2 direction

The target experience is:

1. Upload media.
2. Choose the intended platform and format.
3. Signal silently analyzes the content.
4. Signal produces several finished optimization concepts, such as Clean, Premium, Bold, and Platform Native.
5. The user previews and selects a version.
6. Local edits are applied in Signal; generative edits use the ChatGPT handoff until a direct editing API is intentionally added.
7. The edited result is reimported, compared, and exported.

## Non-negotiable AI rules

- Never recommend taking a new photo or video.
- Never recommend a different camera angle, location, lens, time of day, or lighting setup.
- Never place editing work on the user when Signal can perform or package it.
- Preserve the primary subject’s identity, geometry, proportions, color, position, branding, and important reflections unless the user explicitly allows a creative transformation.
- Separate safe corrective edits from creative transformations.
- Present finished choices in user-facing language.
- Treat engagement predictions as directional estimates, never guarantees.

## Technology

The current application is a lightweight installable PWA built with HTML, CSS, and vanilla JavaScript. It performs basic image processing locally with Canvas and calls Anthropic directly from the browser using a user-provided API key.

## Security note

The current browser-only API-key approach is suitable for a private prototype. Before broad distribution, move AI requests to a secure backend or serverless proxy with authentication, validation, rate limiting, and secrets stored outside the client.

## Development workflow

- `main` remains the stable branch.
- ChatGPT work is developed on `chatgpt/*` branches.
- Claude reviews pull requests for regressions, security concerns, mobile behavior, and architectural issues.
- Changes are merged only after owner approval.

See [ROADMAP.md](ROADMAP.md) and [docs/OPTIMIZATION_PIPELINE.md](docs/OPTIMIZATION_PIPELINE.md).
## V2 contract bridge

Signal currently accepts both native V2 option-first optimization responses and the older analyzer response while the Anthropic prompt transitions. `signal-contract.js` parses model JSON, validates native V2 output, adapts legacy analyzer output into 2–4 finished options, and returns one normalized V2 result for the UI. The legacy adapter is temporary and should be removed after native V2 responses are produced consistently.

## Signal Native V2 Anthropic Pipeline

Anthropic requests now use a dedicated prompt/client split instead of embedding AI orchestration in `index.html`:

- `signal-prompt-builder.js` owns prompt versioning, request context, renderer capability disclosure, unsupported/generative operation disclosure, and the strict native V2 JSON instructions.
- `signal-ai-client.js` owns the browser-only Anthropic request, native V2 parsing, one constrained repair retry, temporary legacy fallback labeling, and redacted diagnostics.

The default prompt version is `signal-v2.1-photo`. It is included in every request context, normalized optimization result, hidden details diagnostics, and project metadata. The primary success path is native Signal V2 JSON only; legacy analyzer adaptation remains available only as a temporary fallback and is explicitly labeled in diagnostics.

Diagnostics intentionally avoid API keys, authorization headers, full source image data, and unredacted sensitive model output. A real end-to-end validation against the live Anthropic API with an app-owner key is still required before this milestone is considered fully validated.

## Local project storage

Signal now uses a dedicated local storage layer for project recovery. Lightweight project metadata remains in `localStorage`, while uploaded originals, local previews, imported AI edits, and optional export images are stored as Blobs in IndexedDB and referenced by asset ID. Existing `localStorage` projects with embedded `data:image/...` values migrate automatically and idempotently the next time they are saved/restored.

Storage schema versions are explicit: `projectVersion: 3`, `assetVersion: 1`, and backup `packageVersion: 1`. See [docs/STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) for the IndexedDB design, migration behavior, quota handling, cleanup utilities, and package backup/restore format.
