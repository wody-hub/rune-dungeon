# Document Consistency Cleanup Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) superpowers:executing-plans implement plan task-by-task. Steps use checkbox (`- [ ]`) syntax tracking.

**Goal:** Make the planning documents consistent enough to use as the source of truth before implementation starts.

**Architecture:** Keep `plan/` as the confirmed design source, keep `progress.md` as the session handoff summary, and avoid moving draft material out of `scratchpad/`. Fix only the documents needed for the five requested consistency issues.

**Tech Stack:** Markdown planning documents, local JSON examples inside `plan/04`, no game code yet.

## Global Constraints
- Preserve the current product direction: hybrid action collection RPG with auto/idle as the product axis.
- Treat the first build as a manual combat and crafting vertical slice, not the full product MVP.
- Use `TypeScript + Vite + Phaser 3`, local JSON, and `localStorage` for the first client implementation.
- Keep the latest incantation proc policy: early four tiers `3%`, high tiers `1%`, final cap `20%`, no internal cooldown.
- Keep the latest material names: `먹: 지킴`, `먹: 남김`, `먹: 돋움`.

---

### Task 1: Clean MVP Roadmap

**Files:**
- Modify: `plan/17_MVP_Development_Roadmap.md`

**Interfaces:**
- Consumes: product direction from `plan/01`, technical stack from `plan/04`, combat values from `plan/03` and `plan/16`.
- Produces: a clean vertical slice roadmap that later implementation work can follow.

- [x] Replace broken Markdown with valid headings, lists, and tables.
- [x] Rename the scope to `아르카디아 수직 슬라이스` so it does not imply the full auto/idle product MVP.
- [x] Make incantation proc part of the vertical slice success criteria.
- [x] Keep deferred items separate from required scope.

### Task 2: Clean Technical Reference

**Files:**
- Modify: `plan/04_Technical_Architecture.md`

**Interfaces:**
- Consumes: tier policy from `plan/12` and `plan/16`.
- Produces: implementation-ready local JSON examples and combat order reference.

- [x] Label `player.json` as an `Lv 12 움결` vertical slice loadout, not a true Lv 1 starter state.
- [x] Replace the `무늬` incantation in MVP sample data with a second `움결` fire incantation.
- [x] Keep `defaultIncantationSlots` at `2` for the MVP greatsword.
- [x] Restore the combat processing table and boss modifier note as valid Markdown.

### Task 3: Resolve INT Proc Policy

**Files:**
- Modify: `plan/03_Item_and_Equipment.md`
- Modify: `plan/16_Character_and_Leveling.md`
- Modify: `plan/04_Technical_Architecture.md`

**Interfaces:**
- Consumes: incantation proc policy from `plan/12`.
- Produces: one clear rule for how proc chance is modified.

- [x] Remove direct `INT 1 = 언령 발동 확률 +0.2%` from MVP stat conversion.
- [x] Define `INT` as incantation damage/effect scaling for now.
- [x] Keep proc chance sources limited to incantation base chance, weapon `procRateBonus`, limited mantra options, and later `천지인`.
- [x] Leave the current proc expectation math valid without hidden `INT` additions.

### Task 4: Rewrite Session Handoff

**Files:**
- Modify: `progress.md`

**Interfaces:**
- Consumes: all cleaned plan decisions.
- Produces: concise next-session handoff with current decisions only.

- [x] Replace broken historical notes with a current-status handoff.
- [x] Explicitly list deprecated decisions, including `5%/2%` proc rates and old `지킴결/남은결/돋움결` names.
- [x] Mark remaining implementation-prep tasks after this cleanup.

### Task 5: Verification

**Files:**
- Inspect: `plan/*.md`
- Inspect: `progress.md`

**Interfaces:**
- Consumes: updated documents.
- Produces: evidence that the five issues are resolved or a list of remaining gaps.

- [x] Search for stale proc values in current plan docs.
- [x] Search for old material names in current source-of-truth docs.
- [x] Search for `INT` direct proc chance references.
- [x] Search for Lv1 loadout conflicts in `plan/04`.
- [x] Check `git diff --stat` and summarize changed files.
