# ChangeLog

## 2026-10-18 — Mass and energy collision response

- Replaced arbitrary impact velocity cuts with a shared planar impulse solver: J = -(1+e) v_normal / (1/m1+1/m2), equal/opposite momentum transfer and Coulomb-limited tangential friction. Fixed scenery has zero inverse mass; contact-specific restitution/friction distinguishes hard rocks/docks and softer ground.
- Added tuned collision masses (sport 1400 kg, runabout 1800, classic 1700, sail 3000, cruiser 4200). Boat impacts separate overlaps in inverse-mass proportion and change both velocities. Traffic now integrates velocity and uses bounded 3 m/s² navigation acceleration, retaining impact response instead of overwriting it next tick.
- HUD reports dissipated planar impact energy in kJ and selected collision mass. These are tuned game parameters, not manufacturer specifications or structural damage estimates. Engine/planing behavior still shares the arcade model.
- Added equation-level momentum, restitution-energy, elastic exchange, glancing friction, no-energy-creation and traffic impulse-persistence tests. New handling-version records preserve older bests.
- Validation: all 47 automated tests and production build pass; the existing bundle-size advisory remains.
- Limits: circular hull/obstacle bounds and rectangular docks, no angular contact inertia/torque, hull deformation, capsizing, continuous swept collision detection or traffic-to-traffic contacts. Position correction is geometric, not a force. Water/propulsion and navigation exchange external energy outside the instantaneous contact solve.

## 2026-10-18 — Fast boundary-aware water

- Baked a deterministic signed-distance atlas of both banks, islands, rocks, sandbanks and dock footprints. One cached 128×4096 single-channel texture (512 KiB; roughly 5×4.6 m cells) replaces per-frame/per-pixel obstacle searches. Bake measured about 113 ms locally; 100,000 CPU wave samples took about 38 ms in a standalone local run, not a cross-device guarantee.
- Shared CPU/GPU waves now damp near boundaries and include small distance-driven returning wavelets with analytical spatial/temporal derivatives. Hull forces therefore respond to the same boundary-modulated field, rather than merely decorating the water normals. Four texture reads per shader field lookup, independent of object count.
- Reduced cosmetic ripples close to land and added animated broken foam bands, shallow tint and masking around static objects, not only the outer banks. Existing moving-boat cosmetic wakes remain unchanged.
- The atlas is an approximate footprint field, not measured bathymetry: small docks/rocks are softened by its resolution. Wavelets approximate local boundary response, not a directional reflection/refraction/diffraction solver; no persistent turbulence, moving-hull feedback, current transport or particle-fluid simulation is claimed.
- New handling-version best-time key preserves older records separately. Added cached atlas/memory/obstacle, near-boundary gradient, energy attenuation and calm-water tests. All 42 tests and production build pass; a fresh browser reported no shader errors and about 99 FPS at 2240×1260 in one stationary local check (not a benchmark guarantee).

## 2026-10-18 — Playable fleet selection

- Added a saved Your Boat selector in Helm Settings covering every active vessel: sport, runabout, cruiser, sailboat and classic. Changing vessel restarts exploration or returns a trial to its start menu, preventing mid-race model changes.
- Player variants share the existing arcade physics, audio and 7.4 m normalized hull length, including auxiliary-powered sailing. This is not vessel-specific mass, wind propulsion or full-sized yacht collision modeling.
- Cached player instances reuse fleet template geometry/materials; switching neither rebuilds models nor disposes assets shared with traffic. Selector is disabled until fleet initialization completes.
- Added full-fleet selection/size and saved-preference migration tests. Tests and production build pass.

## 2026-10-18 — Full-circle camera and lower chase perspective

- Added a saved 0–360° camera orbit slider for chase and arcade views, right-button drag on the water, and a rear-quarter reset. Steering remains boat-relative; orbiting does not alter simulation inputs.
- Lowered and tightened the chase camera, with a default 20° rear-quarter angle to reveal the hull rather than only the roof. Bounded speed-based field of view gives stronger motion cues without camera shake, blur or faster physics.
- Added full-circle, portrait, chase-distance/FOV and preference-migration tests. Automated tests and production build pass. Orbit does not include terrain occlusion avoidance; side/front views near land can be obstructed.

## 2026-10-18 — Dense chop, grounded speedboat handling

- Replaced the large long-period wave spectrum with four shorter low-amplitude components: combined maximum displacement at default swell is 0.44 m rather than 1.60 m; wavelengths are approximately 3–29 m. CPU hull samples and GPU water share the updated field.
- Averaged the four buoyancy patches, reduced their individual force ceiling, increased contact damping/stiffness, reduced planing amplification and limited upward velocity to 3 m/s. Short skips and water contact remain; this is an arcade stability guard, not a validated naval simulation.
- Added normal/boosted 60-second chop regressions at default/maximum swell, checking frequent heaves, clearance below 1.6 m, airtime below 0.85 s and bounded vertical speed in these scenarios. Calm-water and derivative checks remain covered.
- Time-trial bests now use a new handling-version key; older records are preserved separately. Tests and production build pass.

## 2026-10-18 — Water polish and performance visibility

- Finer two-scale cosmetic ripples with screen-footprint filtering, softer distant sun glints and inexpensive cloud-color reflections. Physical wave displacement and hull forces are unchanged; cloud reflections remain artistic approximations.
- Added postprocess edge smoothing and half-resolution bloom to trade a small fullscreen pass for cleaner boat/foliage edges and cheaper glow buffers. Cinematic mode remains optional; no automatic quality changes affect repeatability.
- Press `?` to toggle a lightweight diagnostic overlay: rolling FPS, mean/P95 frame intervals, whole-frame draw calls/triangles, resident geometries/textures, drawing-buffer resolution and loaded sectors. Statistics refresh four times per second only while visible; frame timings are not GPU timings.
- Moved spray emission into fixed simulation steps and seeded/reset its random sequence. Audio noise is now seeded too. This improves repeatability, not cross-device bit-exact replays or deterministic wall-clock input timing.
- Added tests for rolling statistics and exact spray restart repeatability. Production build and automated tests pass; the existing bundle-size advisory remains.

## 2026-10-18 — Covered helms

- Replaced the exposed driving spaces on sport, runabout and classic boats with compact hardtops, opaque tinted glazing, corner frames and side trim. Covered the cruiser's upper helm as well; the sailboat already uses an enclosed cabin.
- Shared fleet templates apply these changes to both the player and passing traffic without adding materials or per-frame animation. No driver characters or transparent cabin interiors are simulated.
- Added geometry-level coverage checks for every helm; automated tests and production build pass.

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
