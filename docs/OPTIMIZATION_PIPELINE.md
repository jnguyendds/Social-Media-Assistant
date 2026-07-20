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