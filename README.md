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

W / ↑ throttle, S / ↓ brake, A D / ← → steer, either Shift boost, C camera, P / Escape pause, R restart. On-screen controls support simultaneous touches. Focus loss pauses automatically. Arcade overview is the default; chase follows the boat's heading. Camera distance adapts to viewport width to keep broad water visible. The exact screen percentage varies with bends, aspect ratio and bank proximity.

## World

The expedition is a finite 18.78 km route through a 304–496 unit wide winding river. Integrating channel width over the full route gives approximately 100× the water corridor area of the supplied prototype's 840-unit scenery section (before subtracting obstacles). The automated test measures this ratio against the supplied bank formula. The original Wake Circuit export was not available, so this comparison uses the actual repository baseline. Islands create passages on both sides; sandbanks and rocks add obstacles. There are 94 deterministic terrain sectors. At most seven nearby sectors are resident, with disposal on unload. A scanner shows upcoming channels. Reaching the south boundary completes the expedition; restarting begins a new run in the same world.

## Water and hull

`src/waves.js` preserves the prototype's analytical wave components. Both CPU hull samples and generated GPU displacement/normal code use these same coefficients in world coordinates. The GPU handles water displacement; there is no per-frame CPU vertex deformation or normal recomputation. Twenty-five recycled water tiles share one geometry and material. The surface slider selects five tessellation budgets (5k–204.8k triangles), with faceted shading below 55 and analytical smooth normals above. It does not change the simulation timestep, wave equations or collision sampling. It is not an SPH/FLIP particle-fluid solver.

Hull motion uses four support samples, relative surface velocity, spring/damper buoyancy, speed-dependent planing lift, gravity during crest jumps and damped landings. Simulation uses a fixed 120 Hz step; slow frames cap catch-up to avoid a spiral of work. Steering and hull-sample transforms now match Three.js heading. Obstacles use circular collision bounds independent of scenery streaming.

## Limits

This is an arcade prototype: rigid hull approximation, circular island/rock/sandbank colliders, no hydrodynamic fluid feedback, no multiplayer or race opponents. The world is finite; passages rejoin around islands rather than forming a general river graph. The hull and wake are simple geometry, and wake points are cosmetic. Geometry is streamed locally, but browser/device performance still depends on GPU, resolution and slider setting. No claim is made of full scientific fluid accuracy or identical CPU/GPU floating-point results.
