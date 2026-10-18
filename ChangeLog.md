# ChangeLog

## 2026-10-18 — Roadmap 4: living weather

- Added saved Living Weather toggle with deterministic slow gusts and wave sets driven by wind strength. Exploration effective swell varies within ±20% of the selected base (still capped at 4×); shared CPU/render samples receive the same effective multiplier. Trials retain fixed swell. Windless/disabled weather remains steady.
- Existing rain/cloud/night rendering reacts to gust wind; moving localized squall fronts are not yet implemented. Full tests and both builds pass before this commit.

## 2026-10-18 — Roadmap 3: throttle and propeller response

- Exploration propulsion now loses effective thrust progressively during airborne ventilation, restoring it on water contact. Planing trim follows throttle, speed and fore/aft loading through the existing hull-response model. Existing hull-specific inertia and energy-based landing audio remain; engine sound is not a recorded propeller simulation.
- Temporary power/trim modifiers are restored every fixed step and do not alter trial rules. Full tests and both builds pass before this commit.

## 2026-10-18 — Roadmap 2: interactive traffic wakes

- Exploration hulls now respond to bounded trailing V-wake crossing fields with directional roll/pitch/heave impulses, scaled by mass. At most 32 traffic boats are queried at fixed simulation steps; no effect on trial/replay rules. Existing traffic wake ribbons remain the visual cue.
- Analytical wake-force approximation, not displaced wake geometry or a fluid solver. It does not yet create dedicated crossing spray/audio beyond existing hull water-contact feedback. Full tests and both builds pass before this commit.

## 2026-10-18 — Roadmap 1: camera reliability

- Exterior views now remember independent framing instead of leaking Chase manual tilt/zoom into Arcade or Wreck. Memories are validated on load; Pilot retains its own look settings. Added saved reduced-follow-motion option. Existing coastal camera clearance remains; vegetation/building collision is not yet modeled.

## 2026-10-18 — Higher exploration swell range

- Exploration now starts/restarts at 2× swell (the old maximum); the slider now reaches 4× (double the old maximum), retaining calm 0×. CPU hull sampling and GPU waves continue using the same multiplier, with no tessellation or solver changes.
- Time trials retain their fixed 1× swell for existing records/replays. Starting exploration after a trial restores the new 2× default. Stronger swell intentionally affects physical heights and slopes, not just surface appearance.
- All 177 tests and both production entry builds pass, including doubled wave amplitude/slopes and finite deterministic hull behavior at the new maximum. Existing shared-bundle advisory remains; rough-sea handling still needs playtesting.

## 2026-10-18 — Camera-switch safeguards and universal view reset

- V / Reset Current View now restores the active view's default framing: Pilot looks straight ahead; exterior views reset orbit, zoom, manual tilt and height. Mouse sensitivity/smoothing, boat state and unrelated settings remain untouched. Active drags and IJKL holds are cleared on reset.
- Camera cuts synchronize underwater fog/tint immediately and reset the immersion veil rather than carrying a previous view's submerged state into the new camera. Normal continuous waterline crossings retain their immersion effect.
- Exterior cameras now clear sampled coastal terrain along the sightline as well as at the eye, preventing low orbit cameras from sitting inside a riverbank. Surface exterior views remain above their local wave; wreck views retain underwater freedom. Twelve fixed terrain samples add no geometry or draw calls. This is coastal/bed clearance, not building/tree/rock camera collision.
- All 175 tests and both production entry builds pass, including sightline/eye clearance, underwater wreck allowance, coastal height sampling, per-view reset scope and universal V shortcut behavior. Existing shared-bundle advisory remains. Exact screenshot reproduction and native switching comfort still need in-game verification.

## 2026-10-18 — Adjustable driver mouse sensitivity and look smoothing

- Added saved Driver Mouse Sensitivity (0.25–3×, default 1×) and Driver Look Smoothing (0–100%, default 35%) sliders. Mouse sensitivity does not change driving or IJKL speeds; both mouse and keyboard share smoothed driver angles.
- Frame-time-based exponential angular smoothing follows the shortest yaw arc across ±180 degrees, with a responsive default ~55 ms time constant and no angular overshoot. Removed the second pilot look-target interpolation to avoid double smoothing; exterior cameras retain their previous behavior. Zero smoothing is immediate and V/reset still snaps straight ahead.
- Separate target/display angles preserve all input while smoothing and reuse fixed objects. Existing tilt limits, saved pilot angles, helm position, sinking and input protections remain unchanged. No boat physics changes.
- All 172 tests and both production entry builds pass, including sensitivity bounds/scaling, wraparound, response time, no overshoot, immediate zero-smoothing mode, output reuse, matching 30/120 Hz results and preference migration/persistence. Existing shared-bundle advisory remains; subjective comfort still needs playtesting.

## 2026-10-18 — Driver POV mouse look and recenter key

- Drag on the game canvas with either left or right mouse button in Pilot view to look horizontally/vertically. Uses the same saved pilot angles as IJKL, with 360-degree yaw and ±75-degree tilt, without moving the helm eye. V or Reset Camera immediately looks straight ahead; driving remaps retain priority.
- Pointer capture keeps drags stable outside the canvas; release, cancellation, lost capture, mode changes and window blur end the gesture and save preferences. Canvas focus restores keyboard controls after settings. Exterior right-drag orbit remains unchanged; touch driving is not intercepted by pilot mouse look.
- All 168 tests and both production entry builds pass, including mouse direction, yaw wrap, tilt bounds, event-rate-independent deltas, keyboard-angle composition, and V repeat/remap/modifier handling. Existing shared-bundle advisory remains; native pointer feel still needs in-game playtesting.

## 2026-10-18 — Driver POV free look

- IJKL now works from the helm: J/L look left/right through 360 degrees, I/K look up/down within ±75 degrees. Separate saved pilot angles leave exterior orbit/tilt settings untouched; Reset Camera returns the driver gaze straight ahead.
- The eye remains at each vessel's helm with existing wave stabilization and sink-with-boat behavior. Zoom/height remain exterior-only; existing typing/remap/blur protections still apply. No cockpit geometry or boat physics changes.
- All 165 tests and both production entry builds pass, including pilot keyboard motion, per-vessel fixed eye positions, left/right/up/down gaze, underwater eye height, preference migration and persistence. Existing shared-bundle advisory remains; subjective comfort still needs playtesting.

## 2026-10-18 — Fix ineffective I/K camera tilt

- Enabled I/K and the angle slider in wreck view, orbiting vertically around the hull while preserving orbit radius and seabed safety. Pilot view remains fixed.
- Fixed close-zoom tilt plateau: when minimum hull distance prevents moving inward, camera height now adjusts to preserve the requested viewing angle instead of silently ignoring it. Requested height can therefore be overridden to maintain angle and hull clearance.
- All 163 tests and both production entry builds pass, including actual camera-angle changes at close zoom in Chase/Arcade/Wreck and updated wreck keyboard/height behavior. Existing shared-bundle advisory remains.

## 2026-10-18 — Zoom and sound keyboard shortcuts

- Added + (or =) to zoom in and − to zoom out, including numeric keypad support and held-key repeat, using existing saved zoom bounds. Z toggles the existing master sound once per press, including from Pilot view. Pilot zoom remains fixed.
- Shortcuts respect typing/remapping, driving-key bindings and browser modifier combinations. Updated camera help and sound-button tooltip. Existing sound controls, volume, audio activation and camera presets are unchanged.
- All 162 tests and both production entry builds pass, covering main/keypad keys, repeat behavior, Pilot restrictions, sound toggle and remap/modifier conflicts. Existing shared-bundle advisory remains.

## 2026-10-18 — IJKL camera keyboard controls

- Hold J/L for 360-degree left/right orbit and I/K for higher/lower viewing angle in Chase/Arcade. Tilt automatically enables existing manual placement, clamps to 5–85 degrees and keeps current height. Controls and saved preferences stay synchronized; writes occur on release/idle rather than every frame.
- Pilot remains fixed; wreck supports J/L orbit but retains its protected tilt. Driving remaps take priority over camera keys, typing/remapping suppresses movement and existing blur clearing prevents stuck keys. Camera can be adjusted while paused without advancing boat physics.
- All 160 tests and both production entry builds pass, including direction, opposing-key cancellation, simultaneous controls, mode restrictions, remap conflicts and frame-time bounds. Existing shared-bundle advisory remains.

## 2026-10-18 — Express and offshore cruisers

- Added two selectable reference-inspired white deep-V express cruisers: Express 37 (11.2 m, 5.8 t, twin outboards) and Offshore 44 (13.4 m, 8.5 t, triple outboards). Enclosed glazed hardtops, sloped windshields, cabin windows/hatches, rails, cockpit seating and radar distinguish them from the existing flybridge cruiser.
- Separate power/thrust, draft, planing, center-of-gravity and rotational-inertia profiles make the larger boat accelerate and turn more slowly while remaining fast. Shared collision masses, pilot viewpoints, existing wear/fuel/lights and boat selection are integrated; existing boats and traffic composition remain unchanged.
- Original procedural models inspired by the supplied image, not licensed manufacturer replicas or engineering-certified performance. Geometry remains merged by material; no new texture downloads or per-vessel lights.
- All 158 tests and both production entry builds pass, including selectable fleet geometry/preferences, mass consistency, model dimensions/batch limits and relative acceleration/steady-thrust speed estimates. The speed comparison is a simplified drag/thrust check, not a measured sea trial. Existing shared-bundle advisory remains; visual quality and on-water feel still need playtesting.

## 2026-10-18 — Boat-reactive fish schools

- Fish schools anticipate nearby player and active traffic boats using a short, bounded projected path. Smooth proximity weighting and depth attenuation push schools away, spread members slightly, turn them toward escape and add a small clearance-clamped dive. Response fades as the boat leaves.
- Keeps the existing 48-fish single batch and 20 Hz update limit. Six school-level threat queries inspect the player plus at most 32 traffic boats; buffers are reused and no simulation randomness or boat physics changes are introduced. Quantized animation poses avoid within-tick frame-time differences.
- This is a lightweight visual avoidance field, not persistent fish AI or collision solving; local cell changes and abrupt boat teleports can still reposition schools. Bed/surface checks remain in force, but decorative rocks are not avoidance obstacles. Cargo Lab is unchanged.
- All 156 tests and both production entry builds pass. Coverage includes approaching/departing boats, inactive traffic, depth attenuation, continuous range falloff, coincident positions, response/work bounds, actual fleeing transforms and identical poses across render schedules. Existing shared-bundle advisory remains; subjective swimming appearance and device GPU performance still need playtesting.

## 2026-10-18 — Underwater fish schools

- Added six small schools, capped at 48 silver/green fish, with shaped bodies, tail/dorsal fins, varied sizes and shader-driven tail movement. Hidden with above-water scenery; no extra lights, shadows or assets.
- One instanced draw batch reuses geometry and buffers. Deterministic local school paths update at most 20 Hz with seabed/surface clearance checks. Decorative only: not fish AI, boat avoidance or fish collisions. Local schools reposition when crossing camera cells.
- All 152 tests and both production entry builds pass, including bounded fish counts, repeatable transforms, buffer reuse and bed clearance. Existing shared-bundle advisory remains. Visual appearance and device-specific performance still need in-game playtesting.

## 2026-10-18 — Waterline immersion and underwater vegetation

- Added a short dark blue-green immersion veil on entering/leaving the water, hiding the abrupt surface switch without a white flash or full black frame. Waterline hysteresis prevents repeated wave-edge flickering; reduced-motion preferences reduce its intensity. HUD stays readable.
- Added deterministic seabed seagrass patches with varied height/color and gentle GPU sway. One additional instanced draw batch, capped at 1,536 ten-vertex blades, no downloads, extra lights or shadows. Placement refreshes only with existing terrain cells/depth settings and hides with above-water scenery.
- Vegetation is lightweight procedural geometry, not photographic flora or a biological simulation. Roots use the analytical bed approximation; distant terrain interpolation can differ. Existing underwater tint, fog, caustics and muffled audio remain. Cargo Lab and boat physics are unchanged.
- All 151 tests and both production entry builds pass, including crossing hysteresis, transition decay, deterministic vegetation and fixed buffer/batch budgets. Existing shared-bundle advisory remains; subjective visual quality and device-specific GPU performance still need playtesting.

## 2026-10-18 — Adjustable shallow-water warning sound

- Added a saved 0.2–5 m under-hull clearance alarm threshold (default 1 m) and independent mute checkbox in Calm Sound Mix. Uses existing five-point clearance estimates, not river-center depth.
- Soft 130 ms sine pulses accelerate near contact. Release hysteresis prevents threshold chatter. One lazily allocated reusable voice follows the effects/master/underwater audio path, pause and gameplay state; missing data and severe flooding suppress warnings. Cargo Lab and physics remain unchanged.
- Added threshold, hysteresis, invalid-data, cadence and audio-graph reuse/mute/pause tests. Alarm remains an approximate gameplay aid; decorative underwater rocks are excluded, and subjective listening/device loudness require player feedback.
- All 149 tests and both production entry builds pass. Existing shared Three.js bundle-size advisory remains.

## 2026-10-18 — River, under-hull and camera depth gauge

- Added a compact always-visible TIDE RAID gauge for river depth under the boat, minimum estimated keel clearance across five hull samples, and actual camera depth beneath its local wave surface. Above-water cameras are labeled explicitly; missing data shows an unavailable reading, not a safe zero.
- Reads the shared scaled depth field at 10 Hz. Clearance accounts for effective flooded draft, vertical hull position, pitch and roll; low-clearance/ground-contact warnings are highlighted. HUD is not underwater-tinted and works in all TIDE RAID camera modes. Cargo Lab is unchanged.
- These are game estimates, not a sonar/navigation instrument: five-point hull/draft approximation, decorative underwater rocks excluded, and negative estimated clearance displayed as ground contact / 0 m.
- All 144 tests and both production builds pass, including independent river/keel/camera readings, flood draft/heave/roll effects, shallow hull samples and unavailable data. Existing shared-bundle warning remains.
- Browser verified the 2× river reading (~33 m), decreasing clearance while sinking, positive underwater camera depth, and 0 m / GROUND CONTACT at the bed without runtime errors.

## 2026-10-18 — Configurable deeper exploration river

- Added saved River Depth multiplier (0.5–4×), defaulting exploration to 2× deeper than the original field, with an 80 m cap. Shoreline minimum depth remains unchanged. Changing the parameter restarts exploration; trials retain their original fixed depth and existing records/replays.
- The same per-voyage numeric depth scale drives grounding, underwater seabed/rocks, wreck-camera clearance and sinking floor. Seabed caches invalidate when the scale changes; no additional mesh budget or downloads.
- All 141 tests and both production builds pass, including multiplier bounds, shoreline preservation, invalid preference handling and matched seabed/physics depth. The 1× path preserves the original depth calculation exactly for trial/replay compatibility. Existing shared-bundle advisory remains.

## 2026-10-18 — Visible seabed, filtered sunlight and external wreck view

- Added saved Wreck inspection camera with underwater hull following, orbit/zoom, terrain clearance and visible player exterior. C / gamepad Y includes the new view; underwater fog/tint/audio apply without requiring the driver sink checkbox. Manual height/tilt is inactive, while normal exterior cameras keep surface safeguards.
- Added one 256 m, 33×33-vertex depth-field seabed patch, at most 48 instanced rocks and one eight-shaft sunlight mesh batch. Terrain and rock transforms update on 32 m cells and reuse buffers; scenery is hidden above water. Reuses existing photographic sand/optimized rock assets, with procedural fallback, and adds no downloads, lights or shadow maps.
- Animated sand caustics and translucent filtered sunlight follow existing daylight/cloud strength and shut off at night. They are shader/mesh approximations, not refractive/volumetric optics. Underwater rocks are decorative; terrain interpolation/clearance is approximate.
- Flooded boats now settle against the actual gameplay depth field (bounded at 80 m) instead of the previous short artificial depth, allowing wreck inspection near the seabed. Cargo Lab and trial physics/records remain unchanged.
- All 139 tests and both production builds pass. New tests cover depth matching, terrain/instance/ray budgets, buffer/asset reuse, unchanged shared texture settings, no per-frame terrain rebuild, hidden above-water scenery and persisted wreck orbit. Browser verified the visible sunken catamaran, textured bed/rocks, light shafts and orbit without runtime errors. Existing bundle-size advisory remains; GPU performance depends on device/view and has not been universally certified.

## 2026-10-18 — Underwater driver tint, visibility, bubbles and audio

- Driver POV with Sink with boat enabled now samples actual camera depth against the shared animated water surface. A smoothed transition applies a blue-green world-view overlay, underwater fog (roughly 20 m at full blend), reduced environment intensity and hidden above-water sky. HUD is not tinted. Effects are independent of cinematic postprocessing and fade on surfacing/mode change.
- Added a deterministic 48-sprite camera-local rising-air haze using one fixed buffer and a 32² ring texture. It respects the boat's remaining-air proxy, hides above-surface sprites and stops when air runs out; existing physical-position hull bubble emitter remains.
- Reused the existing master low-pass filter for progressive 6.5 kHz → 420 Hz muffling and reduced master gain by up to 40%, with smoothing and no per-frame audio-node allocation. User mute, pause and bus levels remain honored; the clear surface mix returns on exit.
- All 136 tests and both production builds pass, covering depth transitions, mode gating, finite inputs, bubble budgets/repeatability and audio reuse/restoration/mute/pause. Existing shared-bundle warning remains. Effects are stylized, not refractive optics or physically modeled underwater acoustics; trial mechanics and Cargo Lab are unchanged.
- Browser drill verified a submerged Pilot eye around 9.4 m below water, blue-green restricted visibility and visible air rings with cinematic mode off; Recover restored the clear surface view. No runtime errors. Audio behavior is graph-tested; subjective headphone/speaker listening validation remains.

## 2026-10-18 — Optional sinking driver camera

- Added saved opt-in checkbox **Driver POV: Sink with boat** beside the camera-view controls. Checked Pilot view follows the actual hull/helm below water during exploration sinking. Unchecked retains the above-water safeguard; exterior cameras remain protected in either case. Defaults off for existing/new players.
- Underwater view uses existing water/sky rendering, not a new underwater optical/refraction effect. Recovery and camera-mode switching remain available.
- All 132 tests and both production builds pass, including opt-in validation/persistence and submerged pilot-eye positioning. Existing shared-bundle advisory remains.

## 2026-10-18 — Damage-dependent flood timing and intake pressure

- Sinking pace now scales nonlinearly with damage severity in both Arcade and Realistic settings, rather than Arcade using a fixed wreck timer. Arcade starts below 12% hull with slower intake; Realistic starts below 30%. Larger effective openings from worse damage admit water faster.
- Inflow also follows external submersion/wave pressure, a bounded forward-speed pressure contribution and opposing internal water head. A dry opening admits no water even at speed. Existing compartment saturation, added flood mass, buoyancy loss and pumping determine subsequent settling; no guaranteed sink countdown is presented. Existing HUD shows actual estimated litres and L/s.
- Accelerated game approximations remain: openings are damage-derived, not calibrated impact holes, and pressure/speed coefficients are tuned rather than validated naval data. No-sinking, trial physics and Cargo Lab are unchanged.
- All 131 tests and both production builds pass. Tests explicitly compare mild/severe damage time to engine cutoff in both modes, pressure/speed response, dry openings and internal-head resistance. Existing shared-bundle advisory remains.

## 2026-10-18 — Pilot / driver POV camera

- Added persistent Pilot view to a direct camera-view selector and the C / gamepad Y cycle (Chase → Pilot → Arcade). Each of the six vessels has its own numeric helm height/fore-aft/lateral offsets; the cruiser sits higher than the low racing catamaran.
- Forward sightline follows heading with limited pitch movement and no camera roll; faster position/target follow reduces steering lag. Exterior height/tilt/orbit/zoom settings are preserved but disabled/ignored in Pilot mode, and mode switching snaps to avoid a flight through the hull. Existing surface-following sinking safeguard remains.
- Player exterior is hidden only in Pilot mode because current cabins have opaque glazing and no modeled interior. This is a clear helm-height POV with existing HUD, not a detailed cockpit/dashboard or driver animation. Other boats, lighting, water and controls remain visible/active. Cargo Lab camera is unchanged.
- All 129 tests and both production page builds pass. Tests cover all-boat eye offsets, heading alignment, ignored exterior settings, limited pitch and persisted/portrait POV. Browser drove the catamaran at ~69 km/h from Pilot view without runtime errors. Existing shared-bundle size advisory remains.

## 2026-10-18 — Progressive flooding, buoyancy loss and escaping-air bubbles

- Replaced exploration's fixed 3 m visual sinking offset with four aggregate flood compartments. Realistic inflow follows damaged opening severity and local water head with biased bow/stern/port/starboard rates; Arcade retains predictable wreck filling. Water persists until harbor pumping/recovery rather than disappearing after damage stops.
- Temporary added mass, increased draft, a free-surface CG penalty, reduced propulsion and late-stage support loss feed the hull step; dry design parameters are restored after each tick. Uneven fills add smoothed list/trim. Submerged drag and depth/shallows limits bound settling. Engines/lamps/headlight footprint cut out at severe flooding, surface wakes stop and camera stays above water. Trial physics uses the unchanged default flotation argument; records/replays and Cargo Lab are untouched.
- Added seeded escaping-air/rising bubbles and expanding/popping surface rings: one 192-point reusable buffer/material, at most 12 emissions/sec, finite trapped-air proxy, automatic retirement and reset. Opaque water hides submerged sprites naturally; no particle-fluid or air-pressure simulation is claimed.
- HUD shows estimated onboard litres and ingress L/s. Added an exploration-only flooding drill and kept no-sinking, service pumps and immediate emergency Recover. Leak locations are damage/bias approximations, not impact-derived breach geometry; compartment interconnection, trapped-air pressure and full floodwater forces/torques remain unmodeled.
- All 127 tests pass, including all-hull bounded sinking, exact repeatability, pressure/no-sinking behavior, retained floodwater, repair/recovery and bubble-pool replay/reset. Both production pages build; existing shared-bundle advisory remains.
- Browser flooding drill reached ~88% flooding with the deck sinking through the water and visible surface bubble rings; emergency Recover restored 40% hull and cleared flooding without runtime errors. Visual particle visibility depends on camera distance and opaque-water occlusion.

## 2026-10-18 — Camera elevation and water-relative height

- Added saved manual camera elevation (5–85° above horizontal water) and height (3–500 m), independently of 360° orbit. Sliders enable manual placement; a button restores existing automatic chase/arcade placement without resetting orbit/zoom.
- Manual framing aims at the boat, derives horizontal distance from height/angle, and samples the shared analytical water level. Existing zoom scales requested height. Vessel-length horizontal clearance and minimum vertical clearance take priority; a live actual-height/angle readout makes those limits visible. Camera smoothing remains; readout describes the target pose.
- Horizontal distance is capped at 1,000 m so extreme high/low-angle settings do not put the boat beyond the 1,600 m camera far plane. All 124 tests and both production pages build successfully; browser verified a 30 m / 40° manual view with no runtime errors. Existing bundle-size advisory remains. Cargo Lab keeps its independent camera controls.

## 2026-10-18 — Separate Cargo Balance Lab prototype

- Added independent `cargo.html` entry point and a link in TIDE RAID Helm Settings. Vite builds both pages for local development and GitHub Pages. Original racing/exploration mechanics, settings, records and replays are untouched; the cargo lab does not use local storage.
- One custom container ship, 18 weighted containers and 24 deck slots across four bays / three columns / two tiers. Click-to-select/place controls enforce support and unblocked lifting; loading has undo/unload. Static list is previewed on the ship with mass/stability/list/trim instruments. All cargo must be aboard to depart.
- A deterministic 120 Hz, 90-second crossing has three smoothly changing wave stages, heel-driven damage and arrival/failure states. Two forecast crane windows allow four total three-second sea moves below 20° heel. Pause freezes the clock/crane; editing a retry preserves the cargo plan. Responsive layout, camera controls and WebGL-failure text fallback included.
- Limits: game approximation, not a marine safety/loading tool. No actual geographic passage, calibrated hydrostatics, suspended-load crane dynamics, stack-strength/lashing/ballast/flooding model, audio, save system or campaign. At-sea crane is intentionally fictional. Ocean uses one reused 90×90 grid; ship/container geometry is shared and renderer pixel ratio capped at 1.5. No extra asset downloads or effects pipeline.
- All 122 tests and the two-page production build pass. New tests cover support/unique manifests, undo, CG/list/trim effects, crane timing/limits, deterministic full crossings, damage/failure and terminal-state behavior. Browser verified all 18 placements, departure and pause without runtime errors. Existing shared Three.js bundle-size advisory remains; phone performance and player enjoyment have not been validated.

## 2026-10-18 — Hull shape, loading and inertia response

- Expanded all six boat profiles with effective waterplane area, fore/aft load share, center-of-gravity height, deadrise, support spacing and three-axis inertia multipliers. Selector explains each hull's handling character.
- Buoyancy stiffness now follows effective waterplane area / mass, with matching damping. Four bounded wave samples stay fixed-cost. Catamaran supports sit wider; front/rear loading weights support and trim. Pitch response depends on pitch inertia; righting/bank response depends on beam, CG height, stability tuning and roll inertia. Deadrise affects drag and per-hull planing trim remains distinct.
- Rudder and collision torque use the same mass-distribution yaw inertia. Traffic now shares its hull beam/yaw factor, while retaining simplified navigation rather than full player hydrodynamics.
- New trial revision v16 isolates old personal bests without deleting them. Replay v2 rejects old physics exports explicitly. These remain tuned approximations, not validated naval models or a true offset-COM rigid-body/pressure solver; capsule collision shape remains unchanged.
- All 115 tests pass, including mass/CG/support effects, consistent steering/contact inertia, rough-water bounds and checksum-exact replay for every boat. Existing dense-chop/anti-flight, collision-energy and other tests remain green.
- Production build passes with the existing bundle-size advisory. Local CPU-only benchmark (120 Hz hull + 18 traffic, 100 simulated seconds) measured 0.066 ms mean / 0.105 ms p95 per step, not a GPU or universal performance guarantee. Browser cruiser selection/propulsion and handling description worked without runtime errors.

## 2026-10-18 — Weather, day/night cycles and navigation lighting

- Added persistent Sunny/Cloudy/Rain presets, 24-hour time control, optional 5–60 minute full-day cycle, wind strength/direction and optional luminous night wakes. Clock follows simulation time and pauses with the game. Wind/weather are visual only; swell, hull physics and trial replay remain unchanged.
- Sky clouds/stars, sun direction/intensity/color, ambient/environment intensity, fog and water shading follow the selected time/weather. Rain uses a fixed 480-streak reusable buffer. No extra shadow maps or per-frame reflection captures.
- Lighthouse rotating beams/lanterns brighten at night. Player and traffic gain shared red/green/white running lamps and forward beam meshes; traffic light rigs cull beyond 350 m. A single shadow-free player spotlight lights nearby standard scenery, with an analytical water headlight footprint. Night wake glow is a stylized optional bioluminescent effect.
- Limitations: static environment reflection capture with changing intensity; no physically scattered/occluded volumetric beams, marine-certified lamp sectors, weather-driven forces or recorded rain/wind audio. All 111 tests and production build pass; browser verified rainy midnight controls and compiled shaders without runtime errors. Existing bundle-size advisory remains; GPU performance is device/view dependent.

## 2026-10-18 — Exploration damage, fuel and service harbors

- Added independent Arcade/Realistic damage, disallowed/Arcade/Realistic sinking, and unlimited/Arcade/Realistic fuel settings. Preferences persist; changing rules restarts exploration. Defaults are forgiving damage, no sinking, arcade fuel. Time trials keep their existing physics, records and replay rules.
- Energy-per-mass impacts and severe landings cause wear; grounding adds gradual damage. Hull/fuel meters and warnings stay visible. Player-only geometry gets bounded reversible dents plus scratch marks; traffic geometry is not mutated. Realistic wear reduces engine power. Wrecked/out-of-fuel/flooded boats lose propulsion.
- Arcade sinking starts only at zero hull; realistic rules flood critically damaged boats progressively. Sinking tilts/lowers the rendered hull and disables propulsion at full flooding; it is not a coupled flood/buoyancy solver or break-apart destruction. No-sinking mode stays afloat but does not grant unlimited engine use.
- Added 16 deterministic green-plus fuel/repair pontoons about 1.2 km apart, shared geometry/materials, distance visibility culling, collision boxes, scanner icons and nearest-harbor distance. Stop within 22 m, below 1.5 m/s and release throttle/reverse for 1.5 s to receive free repair/refuel/pumping. Recovery grants 40% hull/20% fuel minimum and clears flooding so no run is permanently stranded.
- Realistic fuel estimates consumption from rated power/load and a length-based tank; these are unvalidated game approximations, not manufacturer specifications. Arcade fuel creates shorter planning intervals. Repairs and refueling are deliberately accelerated and free; no economy, saved voyage, breakable components or missions yet. Voyage replay export is explicitly blocked rather than exporting an incomplete physics-only replay.
- All 107 tests and production build pass, including deterministic rule evolution, energy scaling, sinking disabled, fuel modes, stopped service, restored/isolation-safe mesh wear and obstacle-clear station placement/collisions. Browser verified selectable rules, driving, live hull/fuel meters and service scanner icons without runtime errors. Existing bundle-size advisory remains; enjoyment and fuel/service balance require playtesting.

## 2026-10-18 — Softer water re-entry audio

- Replaced the landing's reused collision-style one-second descending bass/noise burst with two short water-specific layers: a softened hull slap and delayed, high-passed spray settling over 0.16–0.44 seconds. Smooth attacks avoid the old instantaneous gain onset; no pitched impact oscillator is added.
- Landing energy scales volume without a fixed minimum bang; contacts below 80 J are silent. Speed affects spray brightness/tail. Deterministic noise offsets vary consecutive splashes; 140 ms retrigger protection bounds overlap. Each layer disconnects after finishing. Effects volume, mute and pause still route through the existing shared bus; collision sounds and physics are unchanged.
- This is synthesized water audio, not a recording. Listening feedback is still needed to judge realism across speakers/headphones.
- All 101 tests and production build pass. New tests cover bounded energy/speed response, two-layer scheduling, retrigger protection, silent tiny contacts, pause suppression and cleanup. Existing bundle-size advisory remains.

## 2026-10-18 — Camera zoom and distance presets

- Added persistent 0.5–8× zoom, zoom-in/out buttons, and Wide / Closer / Close / Detail presets beside the camera controls. Mouse wheel over the water zooms without scrolling the settings; browser Ctrl-wheel remains available.
- Arcade zoom reduces camera height and forward look-ahead together, keeping the player framed while making the boat substantially larger. Chase zoom has a vessel-length-dependent minimum distance and height to avoid entering the hull. Zoom changes rendering only, not physics, world scale or replay.
- Settings panel scrolls within the viewport so the new controls remain reachable. All 99 tests and production build pass; browser verified presets and zoom buttons without runtime errors. Existing bundle-size advisory remains. Very close zoom intentionally sacrifices full-channel visibility.

## 2026-10-18 — Independent TIDE RAID GitHub Pages deployment

- Added main-branch/manual Pages workflow with clean dependency installation, full tests, production build, artifact upload and a separate least-privilege deployment job. No history rewriting or changes to another game's repository/site.
- Made built entry points and photographic scenery URLs safe under the `/TIDE-RAID-/` project path; local development and Node tests retain their existing paths.
- Documented the distinction between TIDE RAID and original WAKE CIRCUIT. Original WAKE CIRCUIT source/export is absent, so it has not been reconstructed, renamed or replaced by this release.
- Recorded the owner's existing WAKE CIRCUIT URL without changing that deployment. All 97 tests and production build pass; the existing bundle-size advisory remains.

## 2026-10-18 — Blackjack-style racing catamaran

- Added a selectable Blackjack 42 reference recreation: two pointed sponsons with an open bow tunnel, low enclosed canopy, silver windshield/scoops, glossy dark paint, orange striping, flank lettering, surface-drive propeller and orange rudder. No RC antenna. Custom game geometry from supplied photographs, not an official imported 3D asset or exact product replica.
- Shared geometry is batched into four materials plus one browser-generated lettering material, with no new downloads. Fleet loading now includes every selectable vessel rather than only the traffic catalog.
- Added a 9.4 m / 1,600 kg arcade handling profile. These are game tuning values, not the pictured RC model's specifications. Existing shared buoyancy and single capsule collision approximation remain; separate sponson hydrodynamics are not simulated. Existing boats are unchanged.
- All 96 tests and production build pass, including split-bow clearance, canopy/material bounds, fleet selection and every vessel's handling stability. Browser drive check reached 105 km/h with no runtime errors. Existing build-size advisory remains. Fine mottled graphics and exact reference body contours are simplified.

## 2026-10-18 — Real photographic materials and authored scenery assets

- Bundled CC0 Poly Haven photographic surface sets: Aerial Grass Rock, Coast Sand 01, Rock Boulder Dry and Bark Brown 02. Active terrain uses 1024px WebP albedo plus 512px packed height/roughness derived from the downloaded source maps, not synthesized replacements.
- Imported actual Fir Sapling Medium, Tree Small 02 and Rock 07 model geometry. Optimized near trees contain 5,893/7,031 triangles; rocks use 1,798/160-triangle near/far meshes. Tree distance views are baked locally from the full original model, with three side views and an aerial canopy on four crossed quads (8 triangles), rather than procedural leaf drawings. Near models retain the same silhouette overlay.
- Kept instanced rendering and seven-sector streaming. Near meshes are limited to eight instances per species/sector within 100 m; LOD batches are compacted so hidden near instances do not consume vertex work. Assignment refreshes on 20 m cells. Trees use shared materials across LODs and distant tree shadows are omitted.
- Pack totals 4,905,983 bytes excluding the small provenance manifest. Includes CC0 legal text, original download URLs/MD5 checksums, author credits, optimization metadata and SHA-256 hashes of packaged files. Original ~170 MiB model sources and temporary optimization tools are not shipped. WebP glTF images explicitly declare EXT_texture_webp.
- Added explicit loading/ready/failure UI. Photographic mode replaces the fallback scenery after successful load; failed downloads leave the procedural fallback with a visible warning. Model-based trees are static; very close impostors/LOD transitions remain visible and full photorealism is not claimed. Photographic maps are compressed downloads but consume larger decoded GPU memory.
- All 94 tests and production build pass. Tests cover file hashes/CC0 provenance, self-contained glTF/extension/triangle budgets, shared materials/common normalization and compact LOD instance counts. Browser reported PHOTO ASSETS READY and no runtime errors; an overview sample after compaction showed ~0.76M submitted triangles versus ~12.6M before fixing hidden-instance submission. FPS is view/device dependent; the earlier local overview sample was ~132 FPS at 2240×1260, not a universal guarantee. Physics/replay remain unchanged.

## 2026-10-18 — Textured coast, cutout foliage and neutral lighting

- Replaced solid pine/broadleaf crowns with shared 3D clusters of textured alpha-tested leaf/needle branches, including ground-level shrubs. Crowns use 168/176 triangles rather than the previous 512/~500; instancing, depth-writing cutouts and existing wind remain. Alpha testing introduces overdraw, so lower triangle counts alone do not guarantee faster rendering.
- Added shared deterministic 256² rock, sand, meadow and bark albedo plus linear height/roughness textures, and two 128² foliage cutouts. Texture data totals 2.125 MiB before mipmaps (~2.83 MiB with mip chains); maps are generated once, reused across sectors and require no downloads. World-space mapping avoids dependence on terrain UVs; screen-derivative bump detail gives rock/sand/bark lighting relief.
- Reduced bright ambient fill, warm cast and oversaturation, with cooler haze, matching water-sky color and a more neutral sun/exposure. Shadow-map size and postprocess resolution budgets are unchanged.
- All 90 tests and production build pass. Tests cover shared/mipmapped color-space-correct texture budgets, foliage gaps/geometry bounds and material shader declarations. Fresh browser compiled without errors; a local settled coast-facing check showed ~88 FPS at 2240×1260 with cinematic effects, not a universal performance guarantee. Existing bundle-size advisory remains.
- Limits: textures and foliage are procedural approximations, not photographed/scanned assets. Buildings/boats are unchanged and very close foliage still reveals cards. Physics, collisions and replay determinism are unchanged.

## 2026-10-18 — Organic scenery instead of faceted low-poly forms

- Replaced cone-stack pine geometry with smooth irregular tiered crowns, faceted broadleaf/shrub forms with rounded deformed canopies, low-sided trunks/logs with smoother cylinders and dodecahedral rocks with deterministic weathered rounded meshes.
- Replaced 12-sided vertical island/sandbank rims with 64-segment sloping sandy profiles and increased island/near-shore terrain sampling. Smooth normals remove the deliberately faceted lighting; procedural world-space color grain/patches add subtle grass/sand/stone/foliage variation with distance-filtered fine detail.
- Retained shared geometry, vegetation instancing and seven-sector streaming. Collision layouts, replay physics and world generation are unchanged. This adds triangles but no external texture downloads or per-frame geometry deformation beyond existing wind.
- All 88 tests and production build pass. Tests cover deterministic finite geometry/triangle budgets, smooth instancing and distinct wind/bird shader keys. Fresh browser compiled the shader variants without errors; one coast-facing check reported about 94 FPS at 2240×1260 with cinematic mode (not a device-independent benchmark).
- Limits: procedurally rounded scenery remains stylized, not photogrammetry/photorealism. Buildings and boats retain their existing models; collision boundaries still approximate their smoother visible meshes.

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
