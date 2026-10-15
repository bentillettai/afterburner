# Afterburner

An anti-gravity hover racer for the browser, built with [Three.js](https://threejs.org/). It's a spin-off of Turbo Kart.

The first track is **Neon Circuit**: an elevated, banked circuit about 3 km long through a synthwave night city, with glowing rails, light arches, eight boost pads and a pink pit lane on the start straight. You race the **Afterburner**, a jet kart with its wheels folded flat into hover pods, over 3 laps against 5 computer racers. Top speed is about 400 km/h, and boosting takes it past 600.

Energy is your shield and your boost. It recharges as you race, and much faster in the pit lane. Boosting costs 20, and hard knocks against the walls or other karts take a little. Every kart carries a blaster with 6 bolts, which recharge one every 3 seconds. A hit drains 15 energy from the kart in front, and the rivals shoot back. At zero energy your top speed drops, and a hit with no energy left knocks a third off your speed.

## Run it on your Mac

You need [Node.js](https://nodejs.org/) 18 or newer (`brew install node` works if you use Homebrew).

```sh
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

`npm run build` makes a static version in `dist/` that you can host anywhere. `npm run build:single` also writes `dist/afterburner.html`, the whole game in one file.

## Controls

| Key | Action |
| --- | --- |
| ↑ / W | Thrust |
| ↓ / S | Brake |
| ← → / A D | Steer |
| Space | Air brake, to slide round tight turns |
| Shift | Boost (costs 20 energy) |
| E / X | Fire the blaster |
| R | Restart race |
| F | Full screen |
| M | Sound on or off |
| C | Switch camera |
| P | Pause |

## Code map

| File | What it does |
| --- | --- |
| `src/main.js` | Builds everything and runs the game loop |
| `src/config.js` | Tuning numbers: laps, road width, speeds, boost cost |
| `src/renderer.js` | Renderer, scene, camera and bloom |
| `src/track.js` | Track shape, banking, track-space frames, and the track meshes (rails, pads, pit lane, arches, pylons) |
| `src/world.js` | The city: sky, sun, mountains, grid and buildings |
| `src/kartModel.js` | The Afterburner model and the racers' paint jobs |
| `src/state.js` | Race state, the racers, positions, and placing the models on the track |
| `src/physics.js` | Player handling, boost pads, walls, pit lane and kart-to-kart bumps |
| `src/ai.js` | The computer racers |
| `src/weapons.js` | Blaster bolts, ammo and hits |
| `src/hitfx.js` | What a hit looks like: shield flash, shock ring and damage numbers |
| `src/race.js` | Grid, finish, results and the saved best lap |
| `src/hud.js` | HUD, minimap and the big centre messages |
| `src/camera.js` | Chase camera and speed lines |
| `src/effects.js` | Sparks and speed lines |
| `src/audio.js` | Engine sound and sound effects, made in Web Audio |
| `src/input.js` | Keyboard |
