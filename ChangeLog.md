# ChangeLog

## 2026-10-18 — Vertical 8: cinematic coast and calm spatial soundscape

- Added a procedural clouded sky, matching environment lighting, warmer sunlight, soft local shadows, restrained HDR bloom, subtle color grading/vignette and a one-click Beauty preset. Cinematic effects can be disabled independently for performance.
- Reworked small water ripples with organic noise gradients, richer turquoise/deep-water color, softer crest foam, warmer reflections and subtle hull-contact darkening. Added gentle foliage motion and a wet-to-dry beach gradient.
- Kept the game view clearer on mouse/keyboard devices by showing touch controls only for coarse-pointer layouts.
- Rebuilt the soundscape with softer engine harmonics, low-frequency texture, subdued spray/splash/impact envelopes and a gently breathing coastal wash.
- Added an original 62 BPM ambient score with slow chords, sparse soft-key notes, rests and reverberation. Menu music/ambience can play without engine noise after Sound On.
- Nearby powered boats now emit distance-attenuated, stereo-positioned engine sound with mild bounded Doppler and distance filtering. Sailing boats use quiet water texture rather than a motor tone. Six reusable voices cap traffic-audio cost.
- Added independently saved music, effects, nearby-boat and ambience sliders alongside master volume. Pause/focus loss and Sound Off fade the master bus; no horns or loud music cues were added.
- Validation: 30 automated tests cover sound mixing, scheduling, voice bounds, mute/pause and preference migration alongside existing gameplay checks. Production build passes. Fresh browser startup, Sound On, Beauty preset and cinematic on/off checks pass without reported shader/audio errors.
- Limits: audio is generated synthesis rather than field-recorded engines/surf or an orchestral recording. Reflections, contact darkening and sky remain approximations; cinematic rendering adds GPU cost, and real-device performance/listening feedback remains necessary.

## 2026-10-18 — Vertical 7: harbor villages and detailed coastal vessels

- Added deterministic eight-house coastal villages, foundations, pitched roofs, chimneys, glazed windows and porches on alternating banks, with planked T docks and pilings.
- Added striped lighthouses with lanterns and slowly rotating visual beams. Vegetation leaves clearings around buildings, docks and towers.
- Replaced the active toy-like fleet with original procedural sports boats, classic runabouts, glazed motor cruisers and sailing yachts: curved V hulls, smooth paint/glass/metal materials, teak accents, railings, deck fittings, portholes and billowed sails/rigging.
- Preserved the Kenney assets/license as bundled legacy reference assets; active vessels no longer require GLB downloads. Boats are batched by material to limit draw calls.
- Added dock collisions using the existing impact penalty; piers only intrude along the edges of the river. Harbor-course bests use a new key and previous records remain stored.
- Landmarks stream and unload with the existing seven-sector scenery pool; local beacon materials and geometry are released on unload.
- Validation: 25 tests and production build pass; browser checks show villages, piers and the detailed mixed fleet without reported shader errors.
- Limits: buildings have no interiors, light beams are visual rather than scene-lighting spotlights, and vessels are procedural approximations inspired by the reference rather than photorealistic assets extracted from the picture. Existing approximate boat collisions and analytical water remain in use.

## 2026-10-18 — Vertical 6: richer coastal nature

- Replaced the sparse, uniform tree rows with deterministic woodland clusters, clearings, multi-tier pines, broadleaf crowns and occasional palms, with per-instance size/color/rotation variation.
- Added shrubs, coastal grasses, wildflower accents, driftwood, rocky outcrops and animated seabirds. Islands now have sloping grassy mounds and denser planting.
- Added varying beach widths, rolling foothills, terrain color variation and finer terrain sampling near the shore. River bounds, navigation obstacles and race conditions remain unchanged.
- Nature uses shared geometries and instanced batches; at most seven terrain sectors remain loaded, and terrain/instance resources are released on unloading.
- Prevented needless start/results-panel replacement when the browser normalizes HTML attributes, keeping menu buttons stable.
- Validation: 22 tests and production build pass. New checks cover deterministic placement, species variety, channel clearance, terrain continuity and streaming cleanup. Browser exploration showed the richer coastline and animated birds without reported shader errors.
- Limits: flora, coastal rocks and wildlife are decorative; the environment remains stylized and does not add an ecosystem simulation or colliders for individual plants.

## 2026-10-18 — Vertical 5: Kenney-style fleet and river traffic

- Integrated five actual Watercraft Kit 2.1 models by Kenney (CC0), including their palette texture and original license; the orange speedboat replaces the player model.
- Added an 18-boat traffic pool with blue/yellow speedboats, cabin boats and tugs moving downstream at different speeds, local lane/obstacle avoidance, recycling and wave-following motion.
- Added traffic wakes, scanner markers, approximate boat collisions using the existing impact penalty, clean-overtake counting and results statistics.
- Adjusted coast colors/materials toward the colorful low-poly reference; prevented water/foam drawing over the banks.
- Time-trial records now use a separate traffic-course key so older traffic-free records remain stored without mixing conditions. Trials wait for fleet assets; exploration remains available on load failure.
- Validation: simulation/race/control/audio/traffic tests and production build pass; browser loaded all five models without errors and a gameplay check registered two clean passes. Asset integrity test verifies model textures and the shipped license.
- Limits: traffic is kinematic, uses approximate circular collisions and local avoidance, and does not simulate full boat-to-boat hydrodynamics or guarantee optimal routes. Eighteen boats is the pool limit, not the count always visible on screen.

## 2026-10-18 — Vertical 4: boat, water and sound art pass

- Replaced the box boat with a sculpted V hull, painted deck, racing livery, windshield, seats, helmeted driver, rails and twin outboards.
- Added image-based lighting from a generated sky, warmer sunlight, rolling coastal terrain and instanced coastal trees.
- Added reflective water shading with sun glints, shallow-water color, cosmetic pixel-scale ripples, crest/shore foam, V wake and fading ballistic spray. Near tiles use denser tessellation; the physical four-wave field remains unchanged.
- Moved chase camera closer and made smooth water/chase the defaults for fresh preferences; existing player choices remain intact.
- Rebuilt opt-in audio with engine harmonics, sub-bass, exhaust pulse, filtered wind/water layers and separate splash/impact envelopes. Added header sound toggle and master volume.
- Added audio mix regression coverage. This is procedural art and synthesis, not a licensed production asset pack, recorded motor audio, physical reflections or particle-fluid water.
- Validation: 15 tests pass and production build passes. Browser checks confirm boat/environment rendering, both water-shading modes and audio activation without reported shader/audio errors. Volume is saved with player preferences. Subjective sound quality still needs listening feedback.

## 2026-10-18 — Vertical 3: onboarding and control preferences

- Added action-driven driving hints and an option to hide them.
- Added standard gamepad mapping with stick deadzone, trigger throttle/brake and edge-triggered camera, recovery and pause actions.
- Added keyboard remapping with conflict swapping, steering sensitivity and saved camera/water/hint settings, with storage failure fallback.
- Added unit coverage for gamepad mapping/disconnect, remapping, preference validation/persistence and tutorial progression.
- Added next-gate guidance to the scanner and documented the delivery loop and pending player-validation gate.
- Validation: all 14 tests and production build pass; browser checks confirm remapping and sensitivity survive reload. Test changes to player preferences were restored afterward.
- Controller mapping is tested with simulated input data; physical controller ergonomics and external player enjoyment still require real-device/player testing.

## 2026-10-18 — Vertical 2: Coastal Sprint time trial

- Added a 4 km time trial with ready screen, three-second countdown, five ordered gates, timer, medals, results and instant retry; retained full exploration mode.
- Added limited boost with recharge/release behavior, +2s impact penalties and +5s recovery penalties. Recovery returns behind a missed gate.
- Added local personal bests with blocked/corrupt-storage fallback. Trials lock swell to the standard setting for comparable times.
- Added tests for countdown, gate ordering/misses, penalties, boost and persistent bests. Medal thresholds are provisional pending player testing.

## 2026-10-18 — Vertical 1: handling and recovery

- Spawn heading follows the river, braking stops without unintended reverse thrust, and low-speed/air steering remains responsive.
- Added H/button recovery to a clear part of the current channel and smoothed camera aim.
- Added opt-in synthesized engine sound, impact/splash audio and impact feedback; no external sound assets.
- Added regression coverage for braking and safe recovery across every sector.
- Player enjoyment remains an external playtest gate; technical checks do not establish that gate.

## 2026-10-18 — 2.0 foundation

- Expanded the procedural river to 18.78 km with approximately 100× the supplied prototype's corridor area.
- Added streamed coastlines, islands, rocks, sandbanks, navigation scanner and two camera modes.
- Moved analytical wave displacement to the GPU using shared CPU/GPU coefficients; added tessellation controls.
- Tuned hull buoyancy, planing, steering, jumps and landings; added touch controls and pause handling.
- Validation: five simulation tests pass; production build passes. Browser checks cover throttle, cameras, pause and high-detail water without reported shader errors.
- Known limits: finite world, approximate colliders and hydrodynamics, no external player testing yet; production bundle exceeds Vite's 500 kB advisory threshold.
