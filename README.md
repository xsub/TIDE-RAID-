# TIDE RAID 2.0

## Pilot / driver camera

Select **Helm Settings → Camera View → Pilot / driver POV**, or cycle **C / gamepad Y** through Chase → Pilot → Arcade. Each boat has its own helm-height/seat offset and a forward sightline, with limited pitch and a roll-stabilized horizon. Camera selection persists. External orbit/zoom/manual placement is preserved but inactive in Pilot view. Current opaque exterior cabins are hidden for a clear view: this is a first-person helm-height camera with the existing HUD, not a modeled cockpit interior or animated driver. Cargo Lab retains its separate camera controls.

## Progressive sinking and escaping air

Exploration sinking tracks four simplified bow/stern, port/starboard flood volumes. In both modes, damage severity changes intake nonlinearly: Arcade starts below 12% hull, Realistic below 30%. External wave/submersion head and a bounded forward-speed pressure contribution increase intake, while opposing internal water head reduces it; dry openings admit no water. Worse damage therefore reaches critical flooding sooner under equivalent conditions, rather than using a fixed sink timer. Water stays aboard until pumped at a service harbor or cleared by Recover. Added water mass/draft, a free-surface CG penalty and late-stage flotation loss feed the existing player physics. Uneven flooding adds list/trim; submerged drag, a shallow-water/depth cap, engine/light shutdown and a surface-following camera avoid the old constant downward render offset.

Escaping-air sprites rise from the hull and expand/pop at the analytical wave surface. A seeded 192-particle pool uses one reusable draw buffer/material; finite air supply fades the effect, and pause/recovery/reset do not leave an emitter running. Underwater bubbles can be occluded by the opaque water, while the surface rings remain visible. **Damage & Fuel → Start Flooding Drill** lets you practice with sinking enabled in exploration; H / Recover clears the water and returns partial hull/fuel. Trials and Cargo Lab are unchanged.

This is an accelerated game model: four aggregate compartments, damage-based/bias-weighted openings and simplified pressure flow, not actual hull breach geometry, sealed-air pressure, interconnected compartments, CFD, or validated stability/flooding predictions. Water masses and litre/flow readouts are estimates. Uneven list/trim is a smoothed pose bias; the solver does not integrate the full internal-water pressure/torque field.

## Experimental Cargo Balance Lab

Open **Helm Settings → Cargo Balance Lab**, or visit `cargo.html` beside the main game. This is a separate entry point, UI and deterministic simulation: it does not load or write TIDE RAID preferences, records or replays, and does not change racing/exploration physics.

One fictional 70 m feeder ship carries an 18-container manifest on a four-bay, three-column, two-tier grid. Select a quay/container button, then an empty supported slot. Heavy containers low and a balanced port/starboard and fore/aft plan improve the simplified stability margin, list and trim. The ship view previews static loading list. Loading supports undo and returning unblocked containers to quay. All 18 must be aboard to depart.

The 90-second crossing transitions from gentle water to cross swell to rougher beam sea. Four sea moves are available during 22–30s and 52–60s crane windows, below 20° heel. Each move takes three simulation seconds; pause freezes both sea and crane for planning. Cargo condition falls above severe heel; lost condition or sustained extreme heel fails. Arrival shows retained condition. **Edit / retry load** preserves the arrangement for quick iteration; **Clear deck** starts fresh. Camera rotate/zoom buttons and responsive stacked layout support mouse and touch; no drag-only controls.

This is a fun-test prototype, not maritime training or a safety/loading calculator. Effective KG/GM, fixed restoring/damping coefficients and synthetic wave forcing are simplified, unvalidated approximations. The onboard crane is a fictional arcade concession; cargo transfers apply at completion without simulating suspended loads. No hull stress solver, lashing/stack-strength limits, free-surface flooding, ballast tanks, weather coupling, persistent campaign, economy, audio or mobile-device performance certification. The crossing is represented by a timer and changing ocean around the ship, not a geographic route. Validate whether loading decisions and limited mid-crossing adjustments are enjoyable before expanding it.

## Hull-specific handling

Every selectable boat now defines effective waterplane area, front/rear load share, center-of-gravity height, deadrise, buoyancy support spacing and pitch/roll/yaw inertia factors, alongside existing mass, dimensions, power, draft, drag and rudder area. The boat selector describes its handling character.

Four wave samples remain the fixed-cost support model: the catamaran samples wider twin-sponson positions, deep-V hulls use narrower support, and effective area/mass controls buoyant acceleration and damping. Fore/aft load share changes support weighting and static trim. Pitch inertia changes response speed; center-of-gravity height, beam and roll inertia change righting response and bank. Rudder and off-center collision impulses share the same yaw inertia. Traffic uses its hull's beam/yaw inertia, but retains simplified lane-following motion rather than full player buoyancy dynamics.

These are tuned game approximations, not measured hull hydrostatics: no mesh-derived displacement, integrated pressure field, free-moving ballast, true shifted rigid-body center of mass, propeller torque or separate catamaran collision hulls. Mass distribution is represented by load shares and inertia multipliers. Physics updates invalidate old medal comparisons: trial records use course revision v16 without deleting existing saved records. Physics replay format is v2; old v1 exports are rejected rather than replayed under changed rules.

## Weather and night navigation

**Helm Settings → Weather & Time** offers Sunny / Cloudy / Rain, a 24-hour time slider, optional 5–60 minute full-day cycles, wind strength/direction, and optional glowing night wakes. Controls persist. Cycles use simulation time, so pausing stops the clock. Weather is visual only: wind drives clouds and rain, while the existing Swell slider controls analytical waves independently; hull physics and trial replay are unchanged.

Sun direction/intensity, ambient light, sky/clouds/stars, water shading, fog and environment intensity change with time/weather. Lighthouse beams brighten at night. Player/traffic have automatic red/green/white navigation lamps and forward beam meshes; nearby traffic beams are culled beyond 350 m. One shadow-free player searchlight illuminates standard scenery materials; water gets a cheap analytical forward light footprint. Night glow is stylized bioluminescence, not simulated fluorescence.

Performance limits: 480 reused rain streaks; shared lamp/beam resources; no per-traffic spotlights, extra shadow maps, volumetric ray marching or per-frame reflection-map regeneration. The environment reflection map remains a static daylight capture with time-dependent intensity, and beam meshes do not model physical scattering/occlusion or certified navigation-light sectors. Existing wakes/foam effects are approximate; this is not a meteorological simulator.

## Damage, sinking and fuel voyages

Choose **Explore the Coast**, then **Helm Settings → Damage & Fuel / Exploration**. Damage has independent Arcade/Realistic rules; sinking can be disallowed or use Arcade/Realistic flooding; fuel can be unlimited or use Arcade/Realistic consumption. Changing rules restarts exploration. Defaults: forgiving damage, no sinking, arcade fuel. Time trials remain unchanged and do not use these rules.

Hull condition/fuel meters, dents, scratches and flooding warnings show wear. Hard collisions, severe landings and grounding damage the boat; realistic damage reduces power. Empty fuel or a wreck disables propulsion. Green **+** symbols mark 16 repair/refuel pontoons, roughly 1.2 km apart, with the nearest harbor distance in the HUD. Stop within 22 m, below 1.5 m/s, and release throttle/reverse for 1.5 seconds; service automatically restores fuel, hull and flooding for free. **H / Recover** provides emergency fuel, partial repairs and clears flooding. Explore without fear of an unrecoverable save.

These are prototype gameplay approximations: estimated load-based fuel, accelerated service, bounded mesh dents and simplified four-compartment sinking, not calibrated marine engineering or hull fragmentation. Voyage persistence/economy/missions and voyage-aware replay are not implemented; exploration replay export is blocked. Player trials retain physics replay. Enjoyment and service/fuel balance still require player testing.

## GitHub Pages

TIDE RAID publishes independently at https://xsub.github.io/TIDE-RAID-/ through `.github/workflows/pages.yml`. Every main-branch push runs tests and a production build before deployment; failed checks do not publish. Enable **Settings → Pages → Source → GitHub Actions** once. Relative build URLs and base-aware photographic asset paths support the repository subdirectory. Local development remains `npm run dev`.

The original **[WAKE CIRCUIT](https://wake-circuit.cleverllama2.chatgpt.site)** remains at its existing published address (provided by the project owner). Its original source/export was not found in the available Git history. This deployment does not modify that site or present an older TIDE RAID reconstruction as the original. Archiving its playable source here is deferred until the original export is available.

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

### Bundled real photographic assets

When the HUD says **PHOTO ASSETS / READY**, scenery uses actual CC0 Poly Haven material maps and authored models in `public/assets/real-scenery/`, not the older procedural substitutes described below. Materials: Aerial Grass Rock, Coast Sand 01, Rock Boulder Dry and Bark Brown 02. Models: Fir Sapling Medium, Tree Small 02 and Rock 07. `sources.json` records source URLs, author credits, original checksums and packaged SHA-256 hashes; `CC0-1.0.txt` contains the license. Asset license: https://polyhaven.com/license .

Download payload is about 4.68 MiB plus provenance. Surface albedo is 1024px; packed height/roughness 512px. Trees use reduced authored near meshes plus original-model-rendered silhouette views; distant trees use three side planes and one aerial canopy plane (8 triangles total). Near meshes are capped at eight per species/sector within 100 m, with compact instance batches refreshed on 20 m cells. Rock LOD switches at 120 m. Materials and geometry are shared; seven-sector streaming remains bounded. Decoded GPU memory is larger than download size. Imported model normal/ORM maps were stripped for cost; terrain retains photographic bump/roughness.

The baker in `scripts/bake-real-trees.html` renders the full original CC0 tree glTF sources—not website preview pictures—through the loopback-only server in `scripts/serve-asset-bake.py`. Set `TIDE_ASSET_SOURCE` to the source directory containing `<asset-id>/source.gltf` and its manifest-listed dependencies, and `TIDE_ASSET_OUTPUT` to an output folder; run the Python server and open `/scripts/bake-real-trees.html` under Vite. It produces four-view PNG atlases for conversion to WebP. Raw originals are not bundled; optimization tools/versions are listed in provenance.

Loading is asynchronous. Failure keeps the old procedural scenery and reports **FALLBACK ACTIVE** rather than claiming photographic assets loaded. Imported trees are currently static; close-up cards and LOD transitions remain visible. Buildings, boats, physics and collision footprints are unchanged.

### Organic scenery

Current scenery uses shared mipmapped albedo/height/roughness maps for meadow, sand, rock and bark; world-space mapping and derivative bump detail add lighting relief. Pine/broadleaf/shrub crowns use instanced alpha-tested branch/leaf cards rather than solid blobs. Base texture data is 2.125 MiB before mipmaps; texture generation is deterministic and happens once. More neutral sunlight, ambient fill and haze replace the earlier warm/saturated treatment. Cards reduce geometry but add alpha overdraw; device performance still needs measurement. These are procedural textures/cutouts, not photogrammetry or photographic foliage.

Terrain and foliage no longer intentionally use flat faceted shading. Smooth irregular pine crowns, rounded broadleaf canopies/shrubs and weathered rocks share instanced geometry. Island/sandbank edges slope through 64-segment sandy profiles, with denser near-shore terrain sampling and procedural world-space surface variation. Fine grain fades with pixel footprint to limit shimmer. Streaming stays capped at seven sectors; physical collisions/world generation are unchanged. Geometry cost is higher than the earlier low-poly style. This is procedural naturalization, not photogrammetry or a claim of photorealistic assets.

Personal bests are now separated by selected vessel. Slower hulls have provisional scaled medal targets shown on the start menu; these still need player balancing. Invalid finish times and malformed binding/replay allocations are rejected.

### Remaining realism roadmap

Implemented verticals include capsule contacts, bounded anti-tunnelling, contact settling, yaw impulses/rudder steering, native-size power profiles/reverse, estimated depth/grounding, damped pitch/roll and landing energy, predictive/mutual traffic, cached layouts/CPU benchmark, energy/material sound and bounded replay/checksums.

Still pending: physically coupled historical boat wakes; directional coastal reflection/refraction/diffraction approximations; wake/detail LOD; calibrated hull/propeller immersion and slamming; improved traffic deadlock recovery; optional force/contact visuals; restrained opt-in camera/spray impact cues; interactive replay import; representative GPU/device benchmarks and remaining hot-loop allocation work. Existing cosmetic wakes, analytical shoreline wavelets and the CPU benchmark do not complete those items. Earlier shared-size/kinematic descriptions below are historical and superseded by current sections above.

**Export Physics Replay** saves a local, bounded 10-minute diagnostic tape with controls, wave time/swell, initial hull/traffic state and periodic checksums; nothing is uploaded. `runReplay` in `src/replay.js` verifies physics/traffic repeatability on the same model version, not UI/race/audio/GPU output. Invalid numeric player state is reset to the start. In-game replay import is not implemented.

Impact and landing sounds now use bounded energy-dependent envelopes; ground/dock/hard contacts use different filters. Grounding adds a quiet scrape wash. These remain synthesized feedback cues, not structural damage/acoustics predictions.

Run `node scripts/benchmark.js` for a fixed-input 100-second hull/18-traffic CPU scenario, reporting mean/P95 tick costs. It excludes rendering and is not a universal hardware guarantee. Immutable collision/harbor layouts are cached only for the 94 valid world sectors.

Traffic now predicts near encounters up to four seconds ahead, yields laterally and slows behind nearby hulls. Planning is staggered over four fixed ticks; traffic pairs resolve capsule contacts in stable index order. This is local deterministic avoidance, not a global navigation or deadlock-free solver.

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
