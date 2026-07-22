# Optimization Pipeline

## Purpose

This document defines the contract between Signal’s hidden content analysis, local renderer, external generative editor, and user interface.

The system must transform the uploaded media into selectable finished options. It must not behave as a photography instructor.

## Pipeline

### 1. Intake

Capture:

- media type
- intended platform
- intended format
- optional brand profile
- optional style preference
- whether creative transformations are allowed

Validate the file before making an AI request. Keep the original media unchanged as the project source.

### 2. Hidden inspection

Inspect only what is needed to make edits:

- primary subject and preservation boundaries
- crop-safe region
- exposure and color defects
- distracting objects
- glare and reflections
- background complexity
- platform-safe composition
- text-safe area
- technical quality

This inspection is internal. It should not be rendered as a to-do list by default.

### 3. Create optimization options

Return two to four distinct edit options. Each option must contain:

- a short name
- a one-line outcome description
- destination and output dimensions
- deterministic local adjustments
- generative operations, if required
- preservation rules
- transformation risk level
- a directional platform-fit score

Options should differ meaningfully. They must not be cosmetic duplicates.

### 4. Apply local edits

Canvas can apply no-cost deterministic changes such as:

- crop and resize
- exposure and contrast
- white balance
- saturation and vibrance approximations
- vignette
- blurred 9:16 backdrop
- sharpening approximations

Local edits should be previewed immediately.

### 5. Package generative edits

When an option requires object removal, reconstruction, relighting, extension, or other generative work, produce an edit package for ChatGPT.

The package must state:

- exactly what should change
- where each target is located
- what must remain unchanged
- whether reflections must remain
- how removed areas should be reconstructed
- required crop/aspect ratio
- output quality expectations
- prohibition on unintended subject changes

The package should ask the editor to return one finished image, not advice.

### 6. Reimport and verify

After reimport:

- retain the original and selected option
- compare dimensions and aspect ratio
- verify that the primary subject remains intact
- allow before/after comparison
- allow reanalysis without losing project state
- allow another variant based on the selected option

### 7. Export

Export using destination-specific dimensions and quality. Preserve an untouched original in project state.

## Edit classes

### Safe corrective

May be selected by default:

- exposure and white-balance correction
- straightening and perspective correction
- modest crop
- noise reduction and sharpening
- minor distraction removal
- platform resize

### Enhancement

May be offered as named options:

- restrained color grade
- subject separation
- controlled background softening
- selective light shaping
- glare reduction
- sky and surface refinement

### Creative transformation

Requires explicit user approval:

- background replacement
- time-of-day changes
- major object removal
- canvas extension
- artificial motion effects
- scene relighting
- adding new environmental elements

## Prohibited recommendations

The AI must not tell the user to:

- take another photo
- shoot from another angle
- change lenses or equipment
- return at another time of day
- move the subject or vehicle
- recreate the scene
- manually perform edits Signal can apply or package

## User-facing language

Preferred:

- “Clean — realistic correction and distraction removal”
- “Premium — refined color, controlled reflections, stronger subject separation”
- “Platform Native — composed and exported for Instagram 4:5”

Avoid:

- “You should brighten the image.”
- “Try shooting lower.”
- “Remove the people in the background.”
- “Use a different angle next time.”

## Confidence and prediction

Any fit or engagement score ranks Signal’s own alternatives. It is not a promise of reach, likes, or revenue. The UI must describe it as directional.
## Temporary V2 contract bridge

The UI now consumes a stable normalized V2 optimization result from `SignalContract.parseValidateNormalizeOptimizationResult`.
Native V2 responses are validated as option-first results with named finished optimization options, output formats, preservation rules, local adjustments, generative operations, directional scores, captions, and hashtags.

During the transition, Anthropic may still return the legacy analyzer response. `signal-contract.js` detects that legacy shape and converts it through an isolated adapter into V2-compatible options. The adapter is temporary and can be removed after the Anthropic prompt consistently returns native V2 JSON.

## Native V2 Anthropic request contract

Prompt construction lives in `signal-prompt-builder.js`; Anthropic transport, parsing, repair retry, fallback labeling, and diagnostics live in `signal-ai-client.js`. New AI orchestration should remain out of UI rendering modules.

Every request includes:

- prompt version (`signal-v2.1-photo`)
- selected platform and selected format
- source dimensions, orientation, and media type
- creative-transformation permission
- relevant user preferences
- supported local renderer operations
- unsupported/generative operation list
- preservation requirements for identity, geometry, colors, branding, subject position, and reflections

The primary model response must be a single native V2 JSON object with no Markdown fences or prose. If strict parsing or validation fails, Signal sends one repair request containing redacted validation errors and demands corrected JSON only. There is no unlimited retry loop. If repair fails, the temporary legacy adapter may label the result as `legacy adapted`; otherwise the pipeline fails gracefully.

Local diagnostics track prompt version, model identifier, duration, parsing result, validation result, retry count, legacy fallback usage, diversity failures, and unsupported operations. Diagnostics must never store API keys, authorization headers, full source image data, or unredacted sensitive model output.

## Project storage and recovery

The optimization workflow is unchanged for users, but media persistence now flows through the storage layer:

1. Uploads are analyzed as before.
2. Project metadata is created with `projectVersion: 3` and prompt diagnostics with secret fields redacted.
3. Original uploads, rendered local previews, and imported AI edits are written to IndexedDB assets.
4. Saved projects reference those assets by ID instead of embedding image data URLs.
5. On refresh, tab close, browser restart, or crash recovery, `SignalStorage.getActiveProjectHydrated()` reloads metadata and rehydrates preview/import/export sources from IndexedDB blobs.
6. If an older project still contains `data:image/...` fields, migration imports each data URL into IndexedDB and only replaces that field after the blob write succeeds.

Deletion and backup are storage-layer operations: project deletion removes only assets linked to that project and then runs orphan cleanup; backup exports redacted project JSON plus the referenced media blobs using `packageVersion: 1`.

## Signal More Like This variants
Signal now supports one-level child variants from an existing optimization option. A child keeps the parent creative direction, preservation rules, output contract, and platform context, then varies bounded details according to `signal-v2.2-photo-variants`.

### Parent/child model
Children include lineage metadata (`parentOptionId`, `rootOptionId`, `generationType: more-like-this`, `variationStrength`, `generationIndex`) plus generation metadata (`promptVersion`, `generatedAt`, `model`, `pipelineResult`). Children are fully selectable options with independent preview, imported edit, verification, review, and export state. Grandchildren are intentionally blocked for this milestone.

### Strengths and generation modes
- **Subtle**: small exposure, crop, white-balance, cleanup, vignette, caption, and contrast changes. High-risk generative operations are rejected.
- **Moderate**: safe alternate crops, stronger or softer separation, meaningful tonal changes, and modest approved generative differences.
- **Exploratory**: more pronounced crop, tonal, and platform adaptation with broader approved creative operations while preserving identity, faces, geometry, colors/branding, reflections, and source integrity.

Eligible Subtle requests can be generated locally when the parent uses only deterministic local renderer operations and no generative operations. These are labeled “Generated locally — no AI request.” Other requests use one Anthropic request with strict native V2 parsing and at most one constrained repair attempt.

### Diversity and deletion
Variant batches reject near-duplicates by comparing crop/output geometry, local recipes, generative operations, names, descriptions, and related direction. Valid partial batches are kept only when at least two children remain. Parent deletion is protected when children exist and requires explicit cascade confirmation; deleting a child removes only that child state and assets.

## Brand Profile integration
The optimization pipeline accepts a structured `context.brandProfile` object. Prompt construction consumes this object for creative intent, preservation rules, cleanup hints, requested option count, and More Like This variation defaults instead of scattering profile values across separate parameters.

Precedence is explicit and deterministic: application defaults are applied first, Brand Profile defaults second, project-level overrides third, and current one-off request options last. At project creation the full profile is deep-copied into `profileSnapshot` with `profileId` and `profileVersion`, so later profile edits do not retroactively affect generated projects.
