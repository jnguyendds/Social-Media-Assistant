# Signal V2 Roadmap

## Phase 1 — Foundation and stability

- Document the product as an AI post-production optimizer rather than a content critic.
- Establish a structured optimization contract for AI responses.
- Separate hidden analysis from user-facing edit options.
- Define safe, enhancement, and creative edit classes.
- Add validation requirements and fallback behavior.
- Preserve the current free ChatGPT and CapCut handoffs.
- Refactor the single-file application into separate HTML, CSS, and JavaScript modules without changing behavior.
- Improve upload validation, error states, mobile behavior, and PWA reliability.
- Add automated checks before merging.

## Phase 2 — Option-first optimization experience

- Replace “Analyze” with “Optimize.”
- Ask for platform and post format before processing.
- Generate multiple named edit options rather than a list of recommendations.
- Provide visual previews for local edits.
- Generate one precise ChatGPT edit package per option when generative cleanup is required.
- Let users select “More like this” to create related variants.
- Hide detailed diagnostics behind an optional details view.

Initial photo options:

- **Clean:** realistic correction and distraction removal.
- **Premium:** restrained luxury color and subject separation.
- **Bold:** stronger contrast and thumbnail impact.
- **Platform Native:** crop and tonal treatment optimized for the selected destination.

## Phase 3 — Reimport, compare, and export

- Reimport the ChatGPT-edited result into the same project.
- Compare original and edited versions.
- Verify preservation of the primary subject.
- Show which planned changes were successfully applied.
- Create destination-specific exports.
- Keep project state during the external handoff.

## Phase 4 — Personalization

- Learn from selected and rejected versions.
- Save brand profiles and editing preferences.
- Remember preferred realism, cleanup strength, color treatment, crop, and caption tone.
- Allow users to inspect, edit, and reset learned preferences.

## Phase 5 — Advanced content workflows

- Carousel analysis and ordering.
- Video key-frame, pacing, trim, subtitle, and cover optimization.
- Content history and reusable presets.
- Performance-data import where platform APIs permit it.
- Content planning and calendar tools.

## Cost strategy

The browser app, local Canvas edits, GitHub workflow, and external handoffs can remain free apart from services the user already subscribes to. Direct in-app generative editing requires a paid inference provider unless a suitable free local model becomes practical. Provider-specific editing must remain behind a common adapter so the free handoff can continue to work.
## Signal Native V2 Anthropic Pipeline milestone

Completed direction for this milestone:

- Move Anthropic prompt construction and request orchestration out of `index.html`.
- Version every prompt request with `signal-v2.1-photo` and persist the version in project metadata.
- Prefer strict native Signal V2 JSON, including two to four distinct finished options, dimensions, local adjustments, generative operations, preservation rules, risk, directional platform-fit scores, captions, hashtags, and permitted hidden analysis.
- Run one constrained repair retry for malformed or invalid native output.
- Keep the legacy analyzer adapter temporarily, labeled as `legacy adapted` diagnostics only after native and repaired native paths fail.
- Reject prohibited reshoot/camera/location/user-edit recommendations and duplicate option sets.

Remaining before public distribution:

- App-owner live Anthropic smoke test with a real key.
- Backend/proxy design for production-grade secret handling, rate limits, and auth.

## Signal IndexedDB Project Storage milestone

Completed direction for this milestone:

- Replace embedded media data URLs in saved projects with IndexedDB Blob assets referenced by stable asset IDs.
- Keep project metadata in `localStorage` for lightweight indexing and active-project recovery.
- Add idempotent legacy data URL migration, project/asset schema versions, recovery hydration, quota-friendly failures, project-scoped deletion, orphan cleanup, and local backup/restore packages.

Remaining before broad public distribution:

- Real-device browser storage quota smoke tests across Safari, Chrome, and installed PWA mode.
- UX affordances for manually exporting/importing backup package files from the settings surface.

## Completed: Signal More Like This milestone
- Added one-level child variants from existing optimization options.
- Added Subtle, Moderate, and Exploratory variation strength constraints.
- Added local-only Subtle generation for deterministic local-renderer parents and AI-backed strict V2 generation with prompt version `signal-v2.2-photo-variants`.
- Added lineage, diversity checks, independent project state, persistence, backup/restore survival, and explicit parent cascade deletion policy.

Known limitations: grandchildren, personalization profiles, carousel/video-specific variant expansion, backend billing/auth, and automatic merge/deploy flows remain out of scope.

## Brand Profiles and Preferences
- Added explicit reusable Brand Profiles for creative identity, preservation defaults, cleanup hints, export defaults, and AI defaults.
- Profile influence is inspectable in option details and is snapshotted per project for reproducible display, re-verification, and export.
- Preference learning remains out of scope; future milestones may add opt-in learning without changing historical project snapshots.

## Completed — Signal Carousel Workflow

- Added the CarouselProject model with ordered slides, independent per-slide option/variant/import/verification/export state, and Brand Profile snapshots applied across the full set.
- Added carousel prompt context (`signal-v2.3-carousel`) with slide count, ordering, and role hints: Hook, Context, Detail, Proof, and Call to action.
- Added cross-slide verification for dimension/aspect consistency, duplicate crop/composition warnings, and caption/branding consistency.
- Added backend-free carousel package export using sequential downloads: numbered slide images plus `captions.txt`, `hashtags.txt`, and `manifest.json`.
- Preserved single-image project compatibility through storage/schema version migration.


## Completed — Signal Optimization Intelligence

- Added prompt version `signal-v2.4-scoring` for base options, More Like This variants, and carousel slide optimization.
- Added structured option scores and Optimization Reports while preserving legacy adapter compatibility.
- Added `signal-scoring.js` as the dedicated scoring validation, normalization, weighted-overall, carousel aggregation, and diagnostics-redaction module.
- Scores remain directional/relative only and must not be described as guaranteed real-world engagement predictions.
- Preference Learning, Video expansion, backend services, and automatic carousel reordering remain out of scope.
