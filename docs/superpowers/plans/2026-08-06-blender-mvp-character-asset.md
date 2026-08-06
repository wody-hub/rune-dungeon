# Blender MVP Character Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one lightweight, playable low-poly Aram character asset with a greatsword, shared rig, normal and fire-transformed materials, and `idle`, `walk`, and `attack` animation clips.

**Architecture:** Gate A locks a modelable reference sheet before geometry work begins. Gate B builds one character mesh and one separate greatsword mesh in Blender, then uses one shared humanoid rig for both MVP visual states. Normal and fire transformation keep identical geometry and switch only materials, emissive markings, weapon glow, and later runtime VFX. Transformation stages 2–4 remain out of scope and may use separate skinned meshes in a future plan while preserving the bone and socket contract.

**Tech Stack:** OpenAI built-in image generation for the A2 reference candidate, Blender 5.2 LTS, Mixamo free web workflow, glTF 2.0/GLB, Khronos glTF Validator, Three.js/Threlte runtime.

## Global Constraints

- Preserve the approved hybrid direction in `art/source/characters/concept/mvp-aram-fire-progression-ab-v02.png` and its contract in `docs/superpowers/specs/2026-08-06-aram-fire-transformation-design.md`.
- Character identity: lean SD-to-semi-deformed Aram elf mercenary, short black hair, long pointed ears, fixed dark cloth and light armor, oversized greatsword.
- Equipment, character level, and item tier never change the mesh or materials.
- MVP transformation stage 1 must keep exactly the same character and weapon geometry and silhouette.
- Only normal/transformed materials, emissive markings, weapon emissive, and aura/VFX may change in MVP.
- Character and greatsword are separate meshes. The weapon attaches to a `Weapon_R` socket.
- Prioritize a readable silhouette at the fixed isometric gameplay camera over close-up detail.
- Keep the asset low-poly and use a small material count; do not introduce Meshy, Tripo, paid assets, or paid Blender add-ons.
- Do not overwrite source assets. Add versioned files and update `docs/assets/characters.md` when an asset becomes a candidate, approved, or unused.
- Do not begin stages 2–4 transformation meshes in this plan.

## Target Files

| Path | Responsibility |
| --- | --- |
| `art/source/characters/turnaround/mvp-aram-turnaround-v02.png` | A2 orthographic character and greatsword production reference. |
| `art/source/characters/blender/mvp-aram-character-v01.blend` | Editable character, weapon, materials, rig, and animations. |
| `client/public/assets/characters/mvp-aram-character-v01.glb` | Runtime-ready MVP character package. |
| `docs/assets/characters.md` | Asset source, license, status, and approval record. |
| `plan/06_Art_Direction.md` | Canonical pipeline and visual constraints; update only if a new decision is approved. |

### Task 1: Create and approve the A2 production sheet

**Files:**

- Reference: `art/source/characters/concept/mvp-aram-fire-progression-ab-v02.png`
- Reference: `docs/superpowers/specs/2026-08-06-aram-fire-transformation-design.md`
- Create: `art/source/characters/turnaround/mvp-aram-turnaround-v02.png`
- Modify: `docs/assets/characters.md`

- [ ] **Step 1: Generate one A2 candidate from the approved v02 direction**

Create a neutral technical sheet containing front, side, and back A-pose views of one identical character; a separate orthographic greatsword; normal and fire-transformed material swatches; and a small transformed-state comparison. Keep all views proportionally consistent and remove dramatic perspective, action poses, environment, and cast shadows.

- [ ] **Step 2: Check the sheet against the MVP invariants**

Verify visually that the character has the same face, hair, ears, body proportions, fixed outfit, armor plates, crystal seams, and greatsword as A1. Confirm that fire transformation changes color/emissive treatment only and does not add horns, spikes, armor pieces, cloth, or body mass.

- [ ] **Step 3: Record candidate status**

Add the file to `docs/assets/characters.md` as `A2 / v02 / 후보` with the generation tool, date, source/license note, and unresolved modeling risks. Do not mark it approved until the user accepts its silhouette, proportions, face, and greatsword.

- [ ] **Step 4: Validate repository state**

Run:

~~~bash
file art/source/characters/turnaround/mvp-aram-turnaround-v02.png
git diff --check
git status --short
~~~

Expected: a valid PNG, no whitespace errors, and only the intended candidate image, asset record, and this plan are changed.

### Task 2: Build the low-poly character blockout

**Files:**

- Reference: `art/source/characters/turnaround/mvp-aram-turnaround-v02.png`
- Create: `art/source/characters/blender/mvp-aram-character-v01.blend`

- [ ] **Step 1: Set the Blender scene contract**

Use meters, Z-up, a character height near 1.7–1.8 m before stylized head scaling, origin at ground center, unapplied object transforms only while blocking, and left/right naming that can be mirrored safely.

- [ ] **Step 2: Block one continuous deformation-friendly body**

Model head, torso, arms, hands, legs, and feet as simple low-poly forms in A-pose. Keep elbows, knees, shoulders, hips, neck, and wrists deformable. Model fixed cloth and armor as joined or separate fixed components only where it reduces deformation problems.

- [ ] **Step 3: Match the gameplay silhouette**

Create the large head, lean torso, readable pointed ears, layered skirt/tabard shapes, asymmetric shoulder read, and large boots shown in A2. Avoid details smaller than the projected isometric screen size.

- [ ] **Step 4: Make blockout screenshots**

Render front, side, back, and the project’s fixed isometric view using a neutral clay material. Compare the outline against A2 before adding detail.

### Task 3: Model the separate greatsword and socket contract

**Files:**

- Modify: `art/source/characters/blender/mvp-aram-character-v01.blend`

- [ ] **Step 1: Model the greatsword as a separate object**

Use a simple symmetrical blade, readable guard, grip, pommel crystal, and a narrow emissive groove. Keep its origin and local axes suitable for hand attachment.

- [ ] **Step 2: Establish the attachment contract**

Create or reserve the `Weapon_R` bone/socket, align the grip to the right hand, and verify that weapon transforms do not require per-animation offsets.

- [ ] **Step 3: Check isometric readability**

Confirm the blade does not disappear behind the body in idle and has enough reach to read during attack without enlarging the character silhouette arbitrarily.

### Task 4: Create normal and fire-transformed materials

**Files:**

- Modify: `art/source/characters/blender/mvp-aram-character-v01.blend`

- [ ] **Step 1: Create a compact material layout**

Use a small shared palette for skin, hair, cloth, dark metal, and crystals. Prefer atlas-friendly flat colors and restrained roughness variation over detailed texture painting.

- [ ] **Step 2: Create two state variants**

Normal uses cool cyan crystal accents. Fire transformation reuses the exact meshes and changes only crystals, seams, selected markings, and greatsword groove to orange-red emissive values.

- [ ] **Step 3: Prove identical geometry**

Switch the two states without changing object visibility, modifiers, vertex positions, scale, or weapon geometry. Capture the same camera frame for a direct comparison.

### Task 5: Rig and add MVP animations

**Files:**

- Modify: `art/source/characters/blender/mvp-aram-character-v01.blend`

- [ ] **Step 1: Prepare a Mixamo-compatible humanoid export**

Export a clean temporary FBX with the character in A/T-compatible pose and no greatsword dependency. Use Mixamo only for automatic rigging and the three required animation sources.

- [ ] **Step 2: Import and normalize animation clips**

Bring back `idle`, `walk`, and `attack`; rename actions exactly; preserve a stable root; remove unwanted translation where the runtime expects in-place motion.

- [ ] **Step 3: Correct deformation and weapon handling in Blender**

Fix shoulder, elbow, wrist, hip, knee, and cloth weights. Attach the greatsword to `Weapon_R`, correct grip pose, stop hand/blade intersections, and remove visible foot sliding.

- [ ] **Step 4: Verify both material states on the same rig**

Run all three actions with normal and fire-transformed materials. No state switch may duplicate the armature or change action names.

### Task 6: Export and validate the GLB

**Files:**

- Create: `client/public/assets/characters/mvp-aram-character-v01.glb`
- Modify: `docs/assets/characters.md`

- [ ] **Step 1: Clean the Blender source**

Remove unused objects and materials, apply required transforms/modifiers, check normals, triangulation behavior, weights, animation ranges, scale, ground contact, and object/bone naming.

- [ ] **Step 2: Export one GLB**

Export the character, separate greatsword, one armature, normal/fire material resources, and `idle`, `walk`, `attack` clips. Do not include cameras, lights, hidden prototypes, or unused actions.

- [ ] **Step 3: Run format validation**

Run the Khronos glTF Validator and require zero errors. Record any accepted warning and its reason in `docs/assets/characters.md`.

- [ ] **Step 4: Record source and runtime artifacts**

Add the `.blend` and `.glb` entries with Blender/Mixamo source notes, license constraints, version, and status. Keep Mixamo source animation files out of redistributable asset packages.

### Task 7: Validate in the real isometric runtime

**Files:**

- Reference: `client/public/assets/characters/mvp-aram-character-v01.glb`
- Runtime integration files: define in a separate implementation plan after the GLB passes standalone validation.

- [ ] **Step 1: Load the GLB in an isolated viewer**

Verify scene scale, material assignment, skeleton, all animation clips, weapon attachment, and normal/transformed state switching.

- [ ] **Step 2: Test at the actual gameplay camera**

At the fixed isometric zoom, verify that the head/ears, greatsword, cool-versus-fire state, locomotion direction, and attack timing remain readable against the dark environment.

- [ ] **Step 3: Check runtime budgets**

Measure GLB size, triangle count, draw calls, materials, bones, and texture memory. Record the baseline before optimizing; optimize only a measured bottleneck or a clear multiplayer readability problem.

- [ ] **Step 4: Decide the next plan**

If the asset passes, write a separate Three.js/Threlte integration plan. If it fails, revise only the smallest source stage responsible: silhouette/A2, geometry, material, rig, animation, or export.

## Completion Gate

- A2 is explicitly approved and recorded.
- The Blender source remains editable and versioned.
- One shared rig drives normal and fire-transformed MVP states.
- `idle`, `walk`, and `attack` play without major deformation, foot sliding, or weapon detachment.
- GLB validation has zero errors.
- The character and transformation state are readable at the actual fixed isometric camera.
- No stage 2–4 mesh, equipment appearance system, or unrelated runtime feature was added.
