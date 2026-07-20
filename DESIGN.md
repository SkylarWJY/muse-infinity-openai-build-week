# MUSE Design Source of Truth

## Product intent

MUSE is a learning world, not a museum dashboard and not a chatbot with a 3D background. The world is always the primary surface. UI exists to frame a current observation, expose optional layers, and make system truth inspectable.

## Audience and interaction posture

- Learners should be asked to observe before receiving interpretation.
- A judge should understand the differentiator within the first route: the guide physically moves to the work and the answer changes where she goes next.
- An educator should be able to distinguish live model output, curated content and source evidence.

## Visual system

- Full-bleed real-time world; no decorative preview frame.
- Neutral gallery materials allow artwork colors to remain legible.
- Charcoal UI anchors operational controls without turning the scene into a dark-blue interface.
- Signal yellow-green indicates synchronization and active commands.
- Coral identifies the learner; cyan identifies completed evidence.
- Georgia is reserved for reflective display text. System sans serif is used for commands and telemetry.
- Corners stay at 4 px or less. Cards are not nested.

## Layout

Desktop:

- 64 px top bar: identity, world/sync state, optional layer tools.
- Left mission rail: three-step route and completion state.
- Right-bottom dialogue: guide line, observation choices and learning map.
- Right drawer: one optional capability at a time, leaving the world visible.
- 30 px status bar: route and provider truth.

Mobile:

- 56 px compact icon bar.
- Dialogue occupies at most 46% of viewport height and ends above the control zone.
- 88 px joystick and 70 x 46 px follow control use a stable bottom safe-area band.
- Drawers become bottom sheets, never nested cards.

## Character language

Mira and the learner use a stable joint hierarchy. Locomotion has opposing limbs, foot blocks, vertical weight shift and turn damping. Mira's state sequence is visible in her pose:

`walking -> arriving -> facing -> pointing -> asking -> listening -> reflecting`

Dialogue is forbidden before `GuideDirector.correspondence()` proves distance <= 0.6 m and facing error <= 20 degrees.

## Responsive and accessibility constraints

- No viewport-width font scaling.
- No horizontal document overflow at 390 x 844.
- Touch controls cannot overlap observation answers.
- Every icon tool has a title and accessible name through its text label.
- Focus is visible with the signal color.
- Reduced-motion preference removes authored CSS animation; core state remains usable.
- Text is the source of truth when voice is unavailable.

## Failure states

- GPT unavailable: `CURATED DEMO`, valid route continues.
- Realtime unavailable: concise toast, text unchanged.
- World Labs unavailable: Forge is visibly locked and sends no request.
- Splat/CDN unavailable: procedural world remains rendered.
- Room expires: user returns to solo without changing local lesson state.
