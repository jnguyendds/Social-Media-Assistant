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
