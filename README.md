# Deer Hunter

A short first-person hunting game for phones. Play it at [https://condo32819-ops.github.io/deer-hunter/](https://condo32819-ops.github.io/deer-hunter/).

GitHub Pages serves this folder as a static site. There is no build step.

## How to play

Landscape is the best view. On Android Chrome the hunt asks to go fullscreen and turn sideways when you tap Start, even if auto-rotate is off. If the phone refuses, **Play sideways** turns the view. On an iPhone, the silent switch mutes the shot. Add it to your home screen if you want it fullscreen.

- **Drag** anywhere on the woods to look around
- **Scope** (button, long-press, or two fingers) for a zoomed rifle scope with a little sway
- **Fire** to shoot. It is a bolt rifle: one shot, a short cycle, then the next
- **Reload** when the magazine is empty (it also reloads on its own)
- Optional **tilt aim** on the title screen, if the phone allows motion access

The hunt lasts 2 minutes 30 seconds. You have five rounds in the rifle and ten more in your pocket. Deer, boar, and rabbits wander a wide meadow, and now and then a blue deer sprints across or a piglet scurries past. A shot makes the usual animals look up, then run. A hit just drops the animal — nothing graphic. Doe 100, buck 150, boar 120, rabbit 50, piglet 80, blue deer 400.

A mouse works too: drag to look, right-click to scope, Space to fire, R to reload, M to mute.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in a landscape window.

The 3D view uses [three.js](https://threejs.org/) from a CDN. Sound is generated in the browser.
