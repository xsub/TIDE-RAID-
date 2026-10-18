# TIDE RAID 2.0

Three.js arcade speedboat expedition through a procedural coastal river. Builds on the supplied playable prototype and its four-component analytical wave field.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local Vite URL. `npm run build` produces `dist/`; `npm run preview` serves that build. `npm test` checks wave derivatives, shared shader coefficients, deterministic world generation, obstacle clearance, collision edge cases, hull stability and steering.

## Controls

### Beauty and calm sound

Use **Helm Settings → Beauty Preset** for maximum water detail with cinematic lighting. The visual pass includes a procedural clouded sky, warm environment/sun lighting, local soft shadows, subtle bloom/color grading, organic ripple shading, wet sand and gently moving foliage. Uncheck **Cinematic Lighting** to bypass postprocessing/shadows and lower Water Surface detail for slower GPUs. Mouse/keyboard layouts hide the large touch controls automatically.

Click **Sound / On** to enable audio. Under **Calm Sound Mix**, independently adjust or mute ambient music, your boat/water, nearby boats and coast ambience; master volume controls the full mix. The original ambient score plays at 62 BPM with slow chords, soft-key notes, deliberate rests and reverb. Powered traffic boats emit distance-filtered stereo engine sounds with mild Doppler; sailing yachts emit softer water noise. Only the nearest six audible traffic boats use voices. Menu music and ambience work without engine sound; pause, focus loss and Sound Off fade all sound. Audio is synthesized, not recorded motor/surf samples. Listening feedback and device testing are still needed to judge realism and balance.

W / ↑ throttle, S / ↓ brake, A D / ← → steer, either Shift boost, C camera, P / Escape pause, H recover, R restart. Enter starts a time trial. On-screen controls support simultaneous touches. Focus loss pauses automatically. Chase follows the boat's heading; arcade overview adapts its distance to viewport width to keep broad water visible. The exact screen percentage varies with bends, aspect ratio and bank proximity.

Helm settings include keyboard remapping (conflicts swap), steering sensitivity, water detail, opt-in synthesized audio with master volume and action-driven driving hints. Camera, water detail, volume, sensitivity, key bindings and hint preferences save locally; blocked storage falls back to session-only behavior. New preferences default to smooth water and the close chase camera; existing choices are preserved. Standard gamepads use RT throttle, LT brake, left stick steer, A boost, X recovery, Y camera and Start pause/start. Physical controller testing is still pending.

## Coastal Sprint

The default mode is a 4 km time trial with a three-second countdown and five ordered orange gates. The scanner marks the next gate. Pass between its posts while travelling downstream. Missing a gate requires returning or using recovery, which places the boat upstream of that gate. Boost drains in roughly four seconds and recharges in ten; release the boost button after depletion to use the recharged reserve. Impacts add two seconds; recovery adds five. Gold is 2:10, silver 2:50 and bronze 3:40; these thresholds are provisional. Finished runs show results and save the fastest personal best locally. Trials use standard swell; choose exploration for adjustable swell and the entire 18.78 km river.

## Roadmap delivery loop

Every implementation slice is tested and built, documented in `ChangeLog.md`, then committed and pushed separately. Delivered slices: handling/recovery/audio, complete time-trial loop, and onboarding/control preferences. Tests cover simulation, races, persistence, remapping and controller mapping. Browser checks include start/countdown/pause, recovery penalties and preference persistence.

The next acceptance gate is observing 8–12 new players on this course: can they understand the controls, finish without coaching, explain failures and voluntarily retry? Record where steering, camera visibility, gates or collisions cause frustration. Tune these from that feedback before expanding courses, boats or progression. Automated checks do not establish enjoyment, medal balance or physical controller ergonomics. A release-ready campaign, additional finished courses, final art/audio, device performance matrix and deployment remain future roadmap work.

## World

### Coastal nature

Streamed sectors contain clustered woodland and clearings with pines, broadleaf trees and occasional palms, plus shrubs, grasses, wildflowers, driftwood, rocky outcrops and flying seabirds. Plant sizes, colors and orientations vary deterministically. Beach width and rolling terrain vary along the route, and islands use planted grassy mounds. Nearby land has denser terrain sampling to support shoreline detail. Vegetation and wildlife are rendered with shared geometry and instanced batches; the existing seven-sector residency limit and cleanup apply. These details are decorative, so the river's navigable boundaries and gameplay obstacle layout are unchanged. The visual style remains consistent with the low-poly boats.

### Boats and traffic

The active fleet is built from original procedural vessel geometry: sports racers, classic runabouts, glazed cabin cruisers and sailing yachts. Models include curved V hulls, glossy paint, dark glazing, metal rails, teak deck accents, seats, portholes, fittings and curved sails with rigging. Static parts are merged by material and geometry is shared between traffic instances. The image reference informs proportions and details; these are not photorealistic models extracted from that image. The older procedural TR-07 remains a temporary initialization fallback. Five legacy models from [Watercraft Kit 2.1 by Kenney](https://kenney.nl/assets/watercraft-kit), their texture and original CC0 license remain bundled under `public/assets/watercraft/`; they are no longer the default rendered fleet.

Eighteen traffic boats form a recycled pool: slower speedboats, cabin cruisers and sailing yachts follow downstream lanes and use local obstacle avoidance. They bob with the shared wave field, leave wakes and appear on the scanner. Overtake within 100 units without touching a boat to count a clean pass, once per traffic encounter. Player/traffic impacts use mass-based planar impulses with approximate circular collision bounds and the existing +2s trial penalty. Navigation uses bounded acceleration and retains collision velocity; traffic boats do not collide with each other. Trial bests use a handling-version key; previous records are preserved separately. Trial start waits for fleet initialization; a visible error reports initialization failure and exploration remains usable.

### Villages, piers and lighthouses

Small settlements of eight houses appear every third sector on alternating banks, with planked T docks, pilings and waterfront porches. Striped lighthouses punctuate the coast with glowing lanterns and rotating visual beams. Buildings and foundations follow the coastal terrain; vegetation reserves clearings around structures. Piers extend only about 15 units into the channel, leaving the central racing/traffic lanes open, and have approximate rectangular collision bounds with the existing impact penalty. Buildings have no interiors and the lighthouse beams do not cast scene lighting. Landmarks share the seven-sector streaming lifecycle; beacon geometry and local materials are cleaned up on unload.

The expedition is a finite 18.78 km route through a 304–496 unit wide winding river. Integrating channel width over the full route gives approximately 100× the water corridor area of the supplied prototype's 840-unit scenery section (before subtracting obstacles). The automated test measures this ratio against the supplied bank formula. The original Wake Circuit export was not available, so this comparison uses the actual repository baseline. Islands create passages on both sides; sandbanks and rocks add obstacles. There are 94 deterministic terrain sectors. At most seven nearby sectors are resident, with disposal on unload. A scanner shows upcoming channels. Reaching the south boundary completes the expedition; restarting begins a new run in the same world.

## Water and hull

Pitch/roll now have angular rates and critically damped response; patch-contact velocity includes hull angular motion. Landing energy records pre-response vertical entry kinetic energy for feedback, not structural damage. The attitude model remains an arcade approximation rather than full 6-DOF hydrodynamics.

Procedural bank/island/sandbank depth slopes now drive draft-sensitive shallow drag and grounding friction, with three hull probes and a HUD warning. Deep-draft boats ground sooner. Friction removes energy without reversing stopped boats; reverse/recovery can free the boat. This is estimated bathymetry, not a surveyed bed mesh or tidal model.

Player vessels now have distinct size/mass/power/drag/rudder/planing profiles. Cruiser length is 11 m and sailboat 12 m with matching physics dimensions; smaller craft remain 7.4 m. Acceleration uses bounded thrust/power divided by mass. **B** (remappable) or gamepad **B** engages reduced reverse; **S** remains braking. Values are tuned gameplay approximations. Earlier shared-size descriptions below are historical; current profiles live in `src/vessel-profiles.js`.

### Collision impulses

Player steering now generates rudder torque rather than directly changing heading. Authority depends on forward water flow, immersion, rudder angle and yaw inertia; water resistance damps both steering and impact spin. The same input therefore turns heavier hulls more slowly. Effective flow is capped for stability; coefficients are tuned gameplay approximations, not measured naval data. Traffic retains its navigation controller, and dedicated reverse propulsion remains unimplemented.

Player contacts settle in up to three fixed-order passes per motion interval, exiting early when clear. Very slow normal approaches below 0.5 m/s suppress bounce to reduce resting-contact jitter. Dense opposing constraints can exceed this work budget; this is not a global simultaneous-contact solver.

Fast movement now uses deterministic subdivisions based on translation and hull-tip rotation. Each interval resolves contacts before continuing with the resulting velocity. Normal 120 Hz movement generally uses one interval; the cap is 32. Beyond this safety budget, leftover movement time is discarded. This reduces tunnelling but is not an exact swept time-of-impact solver; moving bodies advance sequentially and tiny/tangent contacts remain approximate.

Hull overlap now uses oriented capsules (a longitudinal segment plus rounded beam-radius ends), not circular ship bounds. Player/traffic contacts use closest capsule features; scenery remains circular and player docks rectangular. The geometry queries have bounded work, deterministic fallback axes and no rendered-mesh searches. Bow reach and side clearance follow heading. Bank handling checks the end caps against local bank samples. Swept collision detection and a multi-contact solver are not implemented yet; extreme speeds can still tunnel, and bank geometry remains approximate.

Collisions use a planar mass-based impulse solver with restitution and Coulomb-limited sliding friction. Boat contacts apply equal/opposite impulses and inverse-mass overlap correction; banks, rocks and docks are fixed bodies. Tuned collision masses range from 1400 kg (sport) to 4200 kg (cruiser), not certified vessel specifications. The HUD displays dissipated planar collision energy in kJ, not predicted hull damage. Traffic retains impact velocity and returns toward its route under bounded acceleration. Propulsion/navigation and water forces exchange energy separately; instantaneous closed two-boat contacts conserve linear momentum and do not create kinetic energy.

Off-centre contacts now produce yaw torque using I = m(L²+B²)/12 and the estimated impact lever arm. Both contact velocity and effective impulse mass include rotation; energy diagnostics include yaw kinetic energy. Fixed-step yaw integration and water damping let the boat turn after impact without sustained artificial spin. Boat-to-boat impulses share a contact point and conserve isolated linear/angular momentum. Rescue/restart clear yaw, and navigation eases heading correction while traffic is spinning.

This is not full rigid-body ship dynamics: capsule hulls, circular scenery and rectangular docks approximate the visible meshes. There is no collision-induced pitch/roll torque, deformation, capsizing, swept continuous collision detection or mutual traffic collision. Steering/navigation remain external arcade controls. All player models still use the shared propulsion/planing model and race-size hull. Trial records use a separate capsule-handling version key.

### Boundary-aware water

A deterministic 512 KiB distance atlas includes both banks, islands, rocks, sandbanks and dock footprints. It is baked once, not rebuilt each frame. CPU hull samples and GPU wave displacement use matching bilinear distance sampling, near-boundary damping and small returning wavelets; normals include the modulation gradients. Shallow tint, broken foam bands and reduced micro-ripples follow static boundaries. Four texture reads per field lookup keep shader cost independent of obstacle count.

The atlas has approximately 5×4.6 m cells; small objects and edges are approximate. This is analytical boundary-aware water, not a fluid solver, measured bathymetry, directional wave diffraction/refraction, or persistent turbulence. Moving traffic retains cosmetic wakes and does not feed energy into the physical field. The low-amplitude sea and upward-velocity guard remain in place. Boundary-version trial records are separate from earlier handling versions.

Choose **Helm Settings → Your Boat** to control any active fleet model: sport, runabout, cruiser, sailboat or classic. Selection is saved. Switching restarts exploration or returns a trial to its start menu. All models are normalized to the same 7.4 m racing length and share propulsion, collision geometry and engine audio, but have different tuned collision masses. The sailboat runs under auxiliary power, not simulated wind. Full vessel-specific hydrodynamics and full-size yacht physics are not implemented.

### Camera orbit

In Helm Settings, **Camera Orbit** sets a saved full-circle angle in either camera mode: 0° rear, 90° side, 180° front, 270° opposite side. Right-drag on the water to orbit with a mouse; the slider also supports touch and keyboard. Reset Camera restores the 20° rear-quarter angle. Chase is lower and closer, with modest speed-based FOV expansion; steering remains boat-relative and physics is unchanged. There is no terrain-occlusion avoidance, so front/side views near banks can be obstructed.

The default physical sea now uses dense, low chop: four components total at most 0.44 m displacement (0.88 m at maximum swell), with approximately 3–29 m wavelengths. Hull buoyancy averages four contact patches with bounded lift and damping; upward speed is capped at 3 m/s to prevent arcade launches. Expect frequent short heaves/skips rather than long flight. These are tuned analytical waves and an arcade hull approximation, not measured real-sea hydrodynamics. Existing pre-chop time-trial bests remain stored separately.

Press **?** (Shift + / on US keyboards) to show or hide performance statistics. FPS uses uncapped browser frame intervals over the most recent 120 samples; P95 shows slow-frame cadence, not GPU execution time. Draw counts include shadow and cinematic passes. The overlay updates four times per second while visible. Cinema adds edge smoothing and half-resolution bloom; turn it off for a cheaper render path. Fine cosmetic ripples fade with pixel footprint to reduce distant shimmer; the physical wave field is unchanged.

Spray uses seeded randomness, resets on restart, and emits at the fixed simulation rate. Procedural audio noise is seeded as well. World generation and physics remain deterministic for the same simulation inputs; browser input timing, frame catch-up limits, audio devices and GPU pixels are not guaranteed bit-identical across machines.

`src/waves.js` defines the shared analytical chop components. Both CPU hull samples and generated GPU displacement/normal code use these same coefficients in world coordinates. The GPU handles water displacement; there is no per-frame CPU vertex deformation or normal recomputation. Twenty-five recycled water tiles share two geometries and one shader material: the inner nine tiles have twice the grid resolution. The surface slider selects five tessellation budgets (10.4k–426k triangles), with faceted shading below 55 and analytical smooth normals above. It does not change the simulation timestep, wave equations or collision sampling. It is not an SPH/FLIP particle-fluid solver.

Water shading adds cosmetic small ripples, Fresnel sky color, sun highlights, shallow-water tint, boundary/crest foam and an analytical V wake. These shading effects do not add hull forces; the shared boundary-modulated wave field does. Spray uses a fixed 384-particle cosmetic pool with fade and ballistic motion. Reflections are procedural sky approximations, not real-time scene reflections.

The TR-07 model uses a shaped V hull, cockpit, windshield, driver, racing number and twin outboards. Coastal terrain has rolling elevations and instanced trees. The audio is generated locally with engine harmonics/sub-bass, exhaust modulation, filtered wind/spray and splash/impact envelopes. It is synthesized sound, not recorded motor audio; sound requires a user gesture via the header toggle. No external art or audio downloads are needed for these effects.

Hull motion uses four support samples, relative surface velocity, spring/damper buoyancy, speed-dependent planing lift, gravity during crest jumps and damped landings. Simulation uses a fixed 120 Hz step; slow frames cap catch-up to avoid a spiral of work. Steering and hull-sample transforms now match Three.js heading. Obstacles use circular collision bounds independent of scenery streaming.

## Limits

This is an arcade prototype: rigid hull approximation, circular island/rock/sandbank colliders, no hydrodynamic fluid feedback, no multiplayer or race opponents. The world is finite; passages rejoin around islands rather than forming a general river graph. The hull and wake are simple geometry, and wake points are cosmetic. Geometry is streamed locally, but browser/device performance still depends on GPU, resolution and slider setting. No claim is made of full scientific fluid accuracy or identical CPU/GPU floating-point results.
