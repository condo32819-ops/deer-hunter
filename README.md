# Deer Hunter

A short first-person hunting game for phones. Play it at [https://condo32819-ops.github.io/deer-hunter/](https://condo32819-ops.github.io/deer-hunter/).

GitHub Pages serves this folder as a static site. There is no build step.

## How to play

Landscape is the best view. On Android Chrome the hunt asks to go fullscreen and turn sideways when you tap Start, even if auto-rotate is off. If the phone refuses, **Play sideways** turns the view. On an iPhone, the silent switch mutes the shot. Add it to your home screen if you want it fullscreen.

- **Drag** anywhere on the woods to look around
- **Scope** (button, long-press, or two fingers) for a zoomed rifle scope with a little sway
- **Fire** to shoot. Tap it again right away, or hold it, for semi-auto at about five shots a second. Every shot still spends one round
- **Reload** when the magazine is empty (it also reloads on its own)
- Optional **tilt aim** on the title screen, if the phone allows motion access

The hunt lasts 2 minutes 30 seconds. You have five rounds in the rifle and ten more in your pocket. The meadow stays busy: deer, boar, and rabbits keep crossing the view, and the rarer animals show up more than once. A blue deer sprints across, a piglet scurries and pauses, and giraffes and elephants lumber through. A lion crosses at half the blue deer's speed, a kangaroo hops across in bouncing arcs, and a cartoon caveman walks through dragging a wooden club. Gorillas knuckle-walk slowly, alone or in a troop of two to four; sometimes the lead gorilla carries a baby overhead. Now and then a poacher walks the plain with an elephant tusk. A banner points you toward him. If he reaches halfway unharmed he stops and fires: each shot costs 150 points, and the third shot ends the stand. Drop him before or during that for 500 points and he drops the tusk. A shot makes the usual animals look up, then run. A hit just drops the animal — nothing graphic. A shot kangaroo pops a joey from its pouch, a shot parent gorilla drops the baby, and a shot rabbit scatters two to four bunnies. The little ones hop or scurry off and can be hit. Doe 100, buck 150, boar 120, rabbit 50, bunny 40, piglet 80, giraffe 200, elephant 250, kangaroo 220, gorilla 160, caveman 140, lion 300, blue deer 400, poacher 500, baby gorilla 700, joey 800.

A mouse works too: drag to look, right-click to scope, Space to fire, R to reload, M to mute.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in a landscape window.

The 3D view uses [three.js](https://threejs.org/) from a CDN. Sound is generated in the browser.
