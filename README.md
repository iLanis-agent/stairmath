# StairMath

Stair building math for people about to cut a stringer. The building code caps
risers at 7 3/4 inches and treads at 10 inches, the lumberyard sells you a 2x12
without mentioning the throat you are about to cut away, and nobody checks the
headroom until the first forehead finds the floor opening.

## What it does

- **Riser and tread counts** from your total rise: risers round up so the unit
  rise never exceeds your ideal, and the tread count is always risers minus one
  (the top tread is the upper floor).
- **Stair angle** with a 28-35 degree comfort band verdict.
- **Stringer geometry**: slope length, cut length, the standard lumber length to
  buy (8/10/12/14/16 ft), and a warning when the flight outgrows a 16 ft board
  and needs a landing.
- **The throat rule**: how much wood is left in a 2x10 or 2x12 after the deepest
  notch cut, measured perpendicular to the board edge. Under 5 inches is a
  warning; under 3.5 is a board that will snap.
- **Headroom check** at the upper-floor opening edge against the 80-inch
  (6 ft 8 in) minimum.
- **Materials list**: stringer count by width and spacing, tread boards, screws.
- **Scale drawing** of the stringer cut profile (SVG).
- **Code check**: every IRC 2021 R311.7 residential limit the design touches,
  as a plain-language verdict list.

## Quickstart

Static site, no build step. Open `index.html` or serve the folder:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Architecture

| File | Purpose |
| --- | --- |
| `index.html` | Landing page |
| `app.html` | The calculator: inputs, presets, verdicts, SVG profile |
| `engine.js` | Pure stair math, no DOM (shared by app and tests) |
| `test-engine.js` | `node test-engine.js` - 45 assertions |

## The math

- Risers: `ceil(totalRise / idealRise)`; unit rise `= totalRise / risers`.
- Treads: `risers - 1`; total run `= treads x treadDepth`.
- Angle: `atan(unitRise / treadDepth)`.
- Slope: `sqrt(rise^2 + run^2)`; buy length is the smallest standard board
  covering slope + 1 ft of cut margin.
- Throat: `boardDepth - unitRise x cos(angle)` (2x10 = 9.25 in, 2x12 = 11.25 in).
- Headroom: `ceilingHeight - rise of the tread under the opening edge`.
- Stringers: `max(2, round(width / spacing) + 1)` including both edges.

## References

- IRC 2021 R311.7 (residential stairways): rise max 7.75 in, run min 10 in,
  headroom min 80 in, 3/8 in max variation, handrail at 4+ risers.
- The 5-inch throat rule of thumb for notched 2x12 stringers.

## License

MIT
