# ChangeLog

## 2026-10-18 — Product robustness: vessel records and input validation

- Personal bests are isolated per vessel, preserving the sport key and older handling-version data. Slower boats use separately displayed provisional medal-time scales; invalid finish times cannot overwrite records.
- Malformed primitive/array keyboard settings fall back safely; legacy remaps migrate reverse without stealing an occupied key. Replay capacity and traffic-pool limits reject unbounded diagnostic allocations.
- All 85 tests and production build pass. Medal targets are provisional and need player testing; performance and simulation approximations remain documented.

## 2026-10-18 — Robustness roadmap: bounded replay diagnostics

- Added local physics replay export: up to 72,000 fixed ticks (10 minutes), exact numeric steering/time/swell, discrete controls, initial hull/traffic state and periodic state checksums. Recording stops at capacity rather than growing indefinitely; no telemetry is uploaded.
- Added a replay runner with format/input validation and checksum verification, plus exact record/replay and tamper tests. It replays physics/traffic, not UI, race scoring, audio or GPU pixels; code-version compatibility is limited to the current format/model.
- Main loop detects invalid numeric hull state and resets safely to the start rather than feeding NaNs into rendering. All tests and production build pass. Exported files contain local gameplay diagnostics; there is no in-game import UI yet.

## 2026-10-18 — Feedback roadmap: energy/material-aware sound

- Impact and landing noise envelopes now scale smoothly with recorded dissipated/entry energy while retaining strict calm gain limits. Soft ground, wooden docks and hard contacts use distinct filtering; grounding adds a quiet speed-dependent scrape wash.
- No random simulation state, camera shake, extra oscillators or unbounded voice pools were introduced. Added monotonicity, material, gain-bound and malformed-input tests; all tests and production build pass.
- Sounds remain synthesized approximations, not recorded hull damage or a structural acoustics model. First-contact event gating remains; sustained manifold scrapes beyond grounding are not implemented.

## 2026-10-18 — Performance roadmap: bounded immutable world caches

- Collision checks now reuse frozen feature/harbor layouts for the finite 94-sector world instead of regenerating terrain circles and village/dock arrays in hot loops. Invalid/out-of-world requests are not retained in caches.
- Added immutable-cache tests and `scripts/benchmark.js`, a reproducible 100-second fixed-input CPU scenario with one hull and 18 traffic boats. It reports mean/P95 tick cost without imposing a flaky hardware-dependent test threshold.
- Tests and production build pass; simulation outputs remain deterministic. Rendering/GPU benchmarks and interactive gameplay performance are separate from this CPU harness.

## 2026-10-18 — Traffic roadmap: predictive yielding and mutual contacts

- Added four-second closest-approach predictions, vessel-length safety margins, bounded lateral yielding and following-speed reduction. Planning is staggered across four fixed ticks and ignores distant bodies.
- Added fixed-index traffic-to-traffic capsule contacts using the same mass/angular impulse solver; nominal cruise settings survive impacts and bounded acceleration restores motion. Pool recycling clears cached intent.
- Added predictive-yield and mutual-contact regressions alongside full deterministic traffic/replay tests. Tests and build pass. This is local avoidance, not global route negotiation or guaranteed deadlock-free behavior; dense pileups remain approximate.

## 2026-10-18 — Water interaction roadmap 2: angular hull response and landing energy

- Added pitch/roll angular rates and exact critically damped attitude response rather than first-order angle interpolation. Hull contact velocities include pitch/roll patch motion, improving damping during bow entry and stern motion.
- Existing four-point buoyancy resolves bow/stern and port/starboard separately; vessel-sized footprints and planing-dependent pitch damping remain bounded. Landing diagnostics now record vertical entry kinetic energy before buoyancy response.
- Added no-overshoot/timestep-consistency and squared landing-energy/rescue tests. All tests and production build pass, including low-hop and rough-sea stability. Attitude targets remain tuned pressure proxies, not a full 6-DOF hydrodynamic torque model.

## 2026-10-18 — Water interaction roadmap 1: draft and grounding

- Added deterministic approximate bed depths from bank distance and island/sandbank slopes, ignoring rocks/docks as depth sources. Three longitudinal hull probes compare depth to vessel draft.
- Shallow water increases drag and reduces planing lift; grounding adds bounded dissipative friction without reversing velocity. HUD reports grounding/depth and suggests reverse/recovery.
- Added deterministic-depth, draft discrimination and energy/stopped-state tests. All tests and production build pass. Depths are procedural estimates, not surveyed bathymetry or a seabed contact solver; tides and wave-trough grounding are not modeled.

## 2026-10-18 — Handling roadmap 2: distinct vessel profiles and reverse

- Player cruiser/sailboat now use native 11/12 m lengths with matching capsule, inertia and buoyancy sampling dimensions. Added per-vessel power, thrust ceiling, drag, lateral grip, rudder area, planing thresholds/lift and draft parameters.
- Thrust is force/mass with a power-limited envelope. Dedicated remappable reverse (B; gamepad B) is weaker and speed-limited; braking still stops without reversing. Existing keyboard preferences migrate the additional binding.
- All 70 tests and production build pass, including each hull's forward/reverse stability and rendering sizes. Profiles are tuned game values, not manufacturer data. Per-vessel record/medal balancing remains pending; this handling key preserves prior times.

## 2026-10-18 — Handling roadmap 1: rudder-driven yaw

- Replaced direct player heading changes with a rudder-force approximation using water density, effective rudder area, squared water-relative forward speed, rudder angle and stern lever arm. Torque acts through hull yaw inertia; heavier vessels respond more slowly.
- Rudder authority vanishes without flow or water contact, reverses with reverse flow, and shares the same yaw state as collision impulses. Analytical damped integration adds speed-dependent yaw resistance without an iterative solver. Effective flow is capped for stable arcade handling.
- Added forward/reverse, stopped/airborne, mass/inertia response, release damping, long-run bounds and deterministic replay tests. All 67 tests and production build pass. Older handling records remain separate.
- This is a tuned rudder approximation, not calibrated hydrodynamics; player thrust/planing and vessel dimensions remain shared. Reverse-flow torque is supported, but dedicated reverse throttle is not yet implemented. Traffic still uses its navigation heading controller.

## 2026-10-18 — Collision roadmap 3: bounded contact settling

- Added up to three fixed-order scenery → dock → traffic contact passes per player motion interval, exiting early when clear. Removed the redundant outer dock check. This repairs contacts introduced by preceding corrections without an unbounded iterative solver.
- Closing speeds below 0.5 m/s use zero restitution, suppressing tiny repeated rebounds while retaining friction and angular effective mass. Larger impacts keep their material restitution.
- Added low-speed rebound, early-exit/work-cap and deterministic repeated-settlement tests. All 64 tests and production build pass. Handling records advance separately.
- Dense opposing constraints can remain unresolved at the pass budget; no warm starting, persistent manifold or exact simultaneous global solve is claimed.

## 2026-10-18 — Collision roadmap 2: bounded anti-tunnelling motion

- Added deterministic motion subdivision based on translation plus rotational tip speed. Ordinary 120 Hz motion normally needs one segment; faster motion checks smaller intervals against scenery, docks and player/traffic contacts.
- Re-evaluates velocity after impulses instead of completing the original pre-impact displacement. A hard 32-segment budget discards excess movement time at absurd velocities rather than teleporting through obstacles or stalling a frame.
- Tests cover a thin pier and small rock crossed at 400 m/s, rotational subdivision, work-cap behavior and exact replay. All 61 tests and production build pass.
- This is bounded discrete anti-tunnelling, not an exact swept time-of-impact solver. Sequentially advanced moving boats, tangent grazing, simultaneous contacts and unusually small custom obstacles remain approximate. Handling records advance separately.

## 2026-10-18 — Collision roadmap 1: oriented capsule hulls

- Replaced player/traffic circular overlap tests with heading-aligned capsules sized from vessel length and beam. Player defaults remain the normalized 7.4×2.8 m race hull; traffic beam scales with rendered vessel length. Narrow side clearances no longer collide merely because bounding circles overlap; bow/stern reach follows heading.
- Added constant-work capsule/capsule, capsule/circle and capsule/rectangle queries, fixed-order closest-segment calculations, bounding rejection and deterministic fallback axes for coincident/crossed spines. Nearby world-sector checks remain bounded; no mesh traversal or iterative general physics engine is involved.
- Contact points now come from capsule geometry for player/traffic, scenery circles and player docks. Existing mass-based linear/angular impulse and friction equations are retained. Bank checks use both capsule end caps; traffic gets a post-heading scenery check because turning changes the occupied shape.
- Added tests for bow/side discrimination, rotated/parallel/crossed/coincident hulls, circle and box nonpenetration, tangency, circular degeneracy and fixed-input gameplay replay. Updated legacy assertions to check actual capsule clearance rather than the removed circular hull radius.
- All 58 tests and production build pass. Best-time handling key advances while older records remain intact. This is discrete collision detection: swept collision/anti-tunnelling and improved simultaneous-contact solving remain the next verticals. Banks use local endpoint approximations and capsules are not exact hull meshes; traffic-to-traffic contacts remain disabled.

## 2026-10-18 — Collision-induced yaw

- Added yaw velocity and mass/length/beam-based inertia, I = m(L²+B²)/12. Contact-point velocities and rotational effective mass now enter normal and friction impulses; torque follows the contact lever arm. Energy diagnostics include both planar translation and yaw rotation.
- Static impacts use an oriented elliptical hull support point; boat-to-boat impulses share one estimated contact point so equal/opposite impulses conserve total linear and angular momentum in the isolated solve. Centred normal contacts produce no spin; bow/stern glancing contacts turn in opposite directions.
- Player and traffic integrate collision yaw at fixed simulation steps with dissipative water damping. Traffic navigation corrects heading less aggressively while spinning. Rescue/restart/recycled traffic clear yaw. No random effects, iterative rigid-body engine or per-frame mesh collision searches were added.
- Added inertia, impact-side direction, angular/linear momentum, total kinetic energy, support-point orientation and deterministic replay tests. The prolonged-hull test now checks downstream progress reached rather than final downstream position, since collisions can turn the boat back upstream.
- All 52 tests and production build pass. Handling-version records preserve earlier times. Limits: overlap detection remains circular with approximate elliptical contact points; no exact mesh manifold, pitch/roll collision torque, damage or capsizing. Steering/navigation remain external arcade controls.

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
