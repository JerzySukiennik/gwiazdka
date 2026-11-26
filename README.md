# Gwiazdka

A Christmas present for Jurek, made by Claude.

Christmas Eve in Gzowo: clouds hide the first star, and nobody can start Wigilia without it. The star waits in a wrapped
present, then rides to the sky in the nose of a Gzofajfus Classic Mk V. On the way up you steer the rocket through
golden stars, and each one you catch plays the next note of "Cicha noc" on a grand piano, in time, with the left hand
playing along. At apogee the parachute opens, the star takes its place, the clouds part over Gzowo and the lights come on.

## Run

Static files, no build. Serve the folder and open it:

```
python3 Niepotrzebne/devserver.py 8524
```

Then open http://localhost:8524.

Controls: mouse or finger moves the rocket across the keys, or arrow keys / A and D step one key at a time.
Hold space, the mouse button or a finger on the screen to launch. M mutes.

## Stack

three.js 0.170 from a CDN, ES modules, Web Audio. Everything in the scene is built in code.

## Credits

- Piano: Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0 (samples as hosted by the Tone.js project).
- Rocket ignition and burn: NASA Kennedy Space Center, Artemis II launch audio, public domain.
- Sleigh bells: The Midnite Wolf, Wikimedia Commons, CC0.
- Church bells: Notre-Dame de Paris on 25 December 2011, recorded by Mxsmanic, Wikimedia Commons, CC0.
- Wind, ribbon, paper, lid, ejection pop, parachute, whoosh and tick: rendered with earshot from public-domain recordings.
- Melody: "Stille Nacht" by Franz Xaver Gruber (1818), public domain.
- Font: Newsreader (SIL Open Font License).
