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

W / ↑ throttle, S / ↓ brake, A D / ← → steer, either Shift boost, C camera, P / Escape pause, H recover, R restart. Enter starts a time trial. On-screen controls support simultaneous touches. Focus loss pauses automatically. Chase follows the boat's heading; arcade overview adapts its distance to viewport width to keep broad water visible. The exact screen percentage varies with bends, aspect ratio and bank proximity.

Helm settings include keyboard remapping (conflicts swap), steering sensitivity, water detail, opt-in synthesized audio with master volume and action-driven driving hints. Camera, water detail, volume, sensitivity, key bindings and hint preferences save locally; blocked storage falls back to session-only behavior. New preferences default to smooth water and the close chase camera; existing choices are preserved. Standard gamepads use RT throttle, LT brake, left stick steer, A boost, X recovery, Y camera and Start pause/start. Physical controller testing is still pending.

## Coastal Sprint

The default mode is a 4 km time trial with a three-second countdown and five ordered orange gates. The scanner marks the next gate. Pass between its posts while travelling downstream. Missing a gate requires returning or using recovery, which places the boat upstream of that gate. Boost drains in roughly four seconds and recharges in ten; release the boost button after depletion to use the recharged reserve. Impacts add two seconds; recovery adds five. Gold is 2:10, silver 2:50 and bronze 3:40; these thresholds are provisional. Finished runs show results and save the fastest personal best locally. Trials use standard swell; choose exploration for adjustable swell and the entire 18.78 km river.

## Roadmap delivery loop

Every implementation slice is tested and built, documented in `ChangeLog.md`, then committed and pushed separately. Delivered slices: handling/recovery/audio, complete time-trial loop, and onboarding/control preferences. Tests cover simulation, races, persistence, remapping and controller mapping. Browser checks include start/countdown/pause, recovery penalties and preference persistence.

The next acceptance gate is observing 8–12 new players on this course: can they understand the controls, finish without coaching, explain failures and voluntarily retry? Record where steering, camera visibility, gates or collisions cause frustration. Tune these from that feedback before expanding courses, boats or progression. Automated checks do not establish enjoyment, medal balance or physical controller ergonomics. A release-ready campaign, additional finished courses, final art/audio, device performance matrix and deployment remain future roadmap work.

## World

The expedition is a finite 18.78 km route through a 304–496 unit wide winding river. Integrating channel width over the full route gives approximately 100× the water corridor area of the supplied prototype's 840-unit scenery section (before subtracting obstacles). The automated test measures this ratio against the supplied bank formula. The original Wake Circuit export was not available, so this comparison uses the actual repository baseline. Islands create passages on both sides; sandbanks and rocks add obstacles. There are 94 deterministic terrain sectors. At most seven nearby sectors are resident, with disposal on unload. A scanner shows upcoming channels. Reaching the south boundary completes the expedition; restarting begins a new run in the same world.

## Water and hull

`src/waves.js` preserves the prototype's analytical wave components. Both CPU hull samples and generated GPU displacement/normal code use these same coefficients in world coordinates. The GPU handles water displacement; there is no per-frame CPU vertex deformation or normal recomputation. Twenty-five recycled water tiles share two geometries and one shader material: the inner nine tiles have twice the grid resolution. The surface slider selects five tessellation budgets (10.4k–426k triangles), with faceted shading below 55 and analytical smooth normals above. It does not change the simulation timestep, wave equations or collision sampling. It is not an SPH/FLIP particle-fluid solver.

Water shading adds cosmetic small ripples, Fresnel sky color, sun highlights, shallow-water tint, shore/crest foam and an analytical V wake. These shading effects do not add hull forces; shore foam currently follows the river banks rather than every island. Spray uses a fixed 384-particle cosmetic pool with fade and ballistic motion. Reflections are procedural sky approximations, not real-time scene reflections.

The TR-07 model uses a shaped V hull, cockpit, windshield, driver, racing number and twin outboards. Coastal terrain has rolling elevations and instanced trees. The audio is generated locally with engine harmonics/sub-bass, exhaust modulation, filtered wind/spray and splash/impact envelopes. It is synthesized sound, not recorded motor audio; sound requires a user gesture via the header toggle. No external art or audio downloads are needed for these effects.

Hull motion uses four support samples, relative surface velocity, spring/damper buoyancy, speed-dependent planing lift, gravity during crest jumps and damped landings. Simulation uses a fixed 120 Hz step; slow frames cap catch-up to avoid a spiral of work. Steering and hull-sample transforms now match Three.js heading. Obstacles use circular collision bounds independent of scenery streaming.

## Limits

This is an arcade prototype: rigid hull approximation, circular island/rock/sandbank colliders, no hydrodynamic fluid feedback, no multiplayer or race opponents. The world is finite; passages rejoin around islands rather than forming a general river graph. The hull and wake are simple geometry, and wake points are cosmetic. Geometry is streamed locally, but browser/device performance still depends on GPU, resolution and slider setting. No claim is made of full scientific fluid accuracy or identical CPU/GPU floating-point results.
