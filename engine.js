/* StairMath engine - stair building math. Pure functions, no DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StairMath = api;
}(typeof self !== 'undefined' ? self : this, function () {

  // IRC 2021 R311.7 residential stair code limits (US).
  var CODE = {
    maxRiseIn: 7.75,       // max riser height
    minRunIn: 10,          // min tread depth
    minHeadroomIn: 80,     // 6 ft 8 in
    handrailMinRisers: 4,  // 4+ risers -> handrail required
    maxVariationIn: 0.375  // 3/8 in max riser/tread variation
  };

  // Actual (not nominal) board depths.
  var BOARD_DEPTH = { '2x10': 9.25, '2x12': 11.25 };
  var LUMBER_FT = [8, 10, 12, 14, 16];

  function r2(x) { return Math.round(x * 100) / 100; }

  // Number of risers: divide the total rise by the ideal, round UP so the
  // actual unit rise never exceeds the ideal.
  function riserCount(totalRiseIn, idealRiseIn) {
    if (totalRiseIn <= 0 || idealRiseIn <= 0) return 0;
    return Math.ceil(totalRiseIn / idealRiseIn - 1e-9);
  }

  function unitRise(totalRiseIn, risers) {
    return risers > 0 ? r2(totalRiseIn / risers) : 0;
  }

  // The top "tread" is the upper floor, so treads = risers - 1.
  function treadCount(risers) { return Math.max(0, risers - 1); }

  function totalRunIn(treads, treadDepthIn) { return treads * treadDepthIn; }

  function angleDeg(unitRiseIn, treadDepthIn) {
    if (treadDepthIn <= 0) return 90;
    return r2(Math.atan2(unitRiseIn, treadDepthIn) * 180 / Math.PI);
  }

  function slopeIn(totalRiseIn, totalRun) {
    return r2(Math.sqrt(totalRiseIn * totalRiseIn + totalRun * totalRun));
  }

  // Smallest standard lumber length covering the slope plus 1 ft of cut margin.
  function stringerBuyFt(slopeLengthIn) {
    var needFt = slopeLengthIn / 12 + 1;
    for (var i = 0; i < LUMBER_FT.length; i++) {
      if (LUMBER_FT[i] >= needFt) return LUMBER_FT[i];
    }
    return null; // longer than a 16 ft board - split the stair with a landing
  }

  // Throat: wood left after the deepest notch cut, measured perpendicular to
  // the board edge. Below ~5 in the stringer is cracked-waiting-to-happen.
  function throatIn(boardSize, unitRiseIn, angleDegValue) {
    var depth = BOARD_DEPTH[boardSize];
    if (!depth) return null;
    var cutPerp = unitRiseIn * Math.cos(angleDegValue * Math.PI / 180);
    return r2(depth - cutPerp);
  }

  // Stringers at the given spacing, including both edges.
  function stringerCount(widthIn, spacingIn) {
    if (widthIn <= 0 || spacingIn <= 0) return 2;
    return Math.max(2, Math.round(widthIn / spacingIn) + 1);
  }

  // Headroom where the upper-floor opening edge hangs over the stair.
  // ceilingIn: lower floor to underside of upper floor.
  // openingIn: horizontal distance from stair start to the opening edge.
  function headroomIn(ceilingIn, openingIn, treadDepthIn, unitRiseIn) {
    var steps = Math.max(1, Math.ceil(openingIn / treadDepthIn));
    var riseAtEdge = steps * unitRiseIn;
    return r2(ceilingIn - riseAtEdge);
  }

  // Cut profile of one stringer, y-up, in inches.
  // notch points start at (0,0), alternate up/right, end at (run, rise).
  function stringerGeometry(risers, treads, unitRiseIn, treadDepthIn, boardSize) {
    var pts = [[0, 0]];
    for (var i = 1; i <= risers; i++) {
      pts.push([pts[pts.length - 1][0], r2(pts[pts.length - 1][1] + unitRiseIn)]);
      if (i <= treads) pts.push([r2(pts[pts.length - 1][0] + treadDepthIn), pts[pts.length - 1][1]]);
    }
    var run = treads * treadDepthIn, rise = risers * unitRiseIn;
    var hyp = Math.sqrt(run * run + rise * rise);
    var d = BOARD_DEPTH[boardSize] || 9.25;
    var ox = hyp > 0 ? d * rise / hyp : 0, oy = hyp > 0 ? -d * run / hyp : -d;
    return {
      notch: pts,
      bottom: [[r2(ox), r2(oy)], [r2(run + ox), r2(rise + oy)]],
      runIn: r2(run), riseIn: r2(rise)
    };
  }

  function checks(res, input) {
    var out = [];
    if (res.unitRiseIn > CODE.maxRiseIn) {
      out.push({ level: 'bad', text: 'Riser ' + res.unitRiseIn + ' in exceeds the IRC max of 7.75 in - a trip hazard and a code fail.' });
    } else {
      out.push({ level: 'good', text: 'Unit rise ' + res.unitRiseIn + ' in, uniform by construction (code allows 3/8 in variation max).' });
    }
    if (input.treadDepthIn < CODE.minRunIn) {
      out.push({ level: 'bad', text: 'Tread ' + input.treadDepthIn + ' in is under the 10 in IRC minimum - your whole foot needs to land on it.' });
    } else {
      out.push({ level: 'good', text: 'Tread depth ' + input.treadDepthIn + ' in clears the 10 in minimum.' });
    }
    if (res.angleDeg > 38) {
      out.push({ level: 'bad', text: 'Stair angle ' + res.angleDeg + ' deg is ladder territory - shorten the rise per step or lengthen the run.' });
    } else if (res.angleDeg > 35) {
      out.push({ level: 'warn', text: 'Stair angle ' + res.angleDeg + ' deg is steep (comfortable band is 28-35 deg).' });
    } else if (res.angleDeg < 28) {
      out.push({ level: 'warn', text: 'Stair angle ' + res.angleDeg + ' deg is shallow - comfortable, but it eats ' + res.totalRunIn + ' in of floor.' });
    } else {
      out.push({ level: 'good', text: 'Stair angle ' + res.angleDeg + ' deg sits in the comfortable 28-35 deg band.' });
    }
    if (res.throatIn != null) {
      if (res.throatIn < 3.5) {
        out.push({ level: 'bad', text: 'Only ' + res.throatIn + ' in of throat left in the ' + input.boardSize + ' after the notch cuts - it will snap. Use a 2x12 or shallower risers.' });
      } else if (res.throatIn < 5) {
        out.push({ level: 'warn', text: 'Throat ' + res.throatIn + ' in on a ' + input.boardSize + ' is under the 5 in rule of thumb - a 2x12 leaves ' + throatIn('2x12', res.unitRiseIn, res.angleDeg) + ' in.' });
      } else {
        out.push({ level: 'good', text: 'Throat ' + res.throatIn + ' in left in the ' + input.boardSize + ' - a healthy board.' });
      }
    }
    if (res.stringerBuyFt == null) {
      out.push({ level: 'bad', text: 'Stringer slope ' + res.slopeIn + ' in (' + r2(res.slopeIn / 12) + ' ft) needs more than a 16 ft board with cut margin - split the stair with a landing.' });
    }
    if (res.headroomIn != null) {
      if (res.headroomIn < CODE.minHeadroomIn) {
        out.push({ level: 'bad', text: 'Headroom ' + res.headroomIn + ' in at the opening edge is under the 80 in (6 ft 8 in) minimum - lengthen the opening or start the stair further out.' });
      } else {
        out.push({ level: 'good', text: 'Headroom ' + res.headroomIn + ' in at the opening edge clears 80 in.' });
      }
    }
    if (res.risers >= CODE.handrailMinRisers) {
      out.push({ level: 'warn', text: res.risers + ' risers means a handrail is required (4 or more).' });
    }
    return out;
  }

  function compute(input) {
    var rise = +input.totalRiseIn;
    var ideal = +(input.idealRiseIn || 7);
    var tread = +(input.treadDepthIn || 11);
    var width = +(input.widthIn || 36);
    var board = input.boardSize || '2x12';
    var spacing = +(input.stringerSpacingIn || 16);
    if (!(rise > 0)) return { error: 'Total rise must be a positive number of inches.' };

    var risers = riserCount(rise, ideal);
    var uRise = unitRise(rise, risers);
    var treads = treadCount(risers);
    var run = totalRunIn(treads, tread);
    var angle = angleDeg(uRise, tread);
    var slope = slopeIn(rise, run);
    var res = {
      risers: risers,
      unitRiseIn: uRise,
      treads: treads,
      totalRunIn: run,
      angleDeg: angle,
      slopeIn: slope,
      stringerCount: stringerCount(width, spacing),
      stringerCutFt: r2(slope / 12),
      stringerBuyFt: stringerBuyFt(slope),
      throatIn: throatIn(board, uRise, angle),
      headroomIn: null,
      treadBoards: Math.ceil(treads * width / 144),
      screws: treads * stringerCount(width, spacing) * 2,
      geometry: stringerGeometry(risers, treads, uRise, tread, board)
    };
    if (input.ceilingIn != null && input.ceilingIn !== '' && input.openingIn != null && input.openingIn !== '') {
      res.headroomIn = headroomIn(+input.ceilingIn, +input.openingIn, tread, uRise);
    }
    res.checks = checks(res, { treadDepthIn: tread, boardSize: board });
    return res;
  }

  return {
    CODE: CODE, BOARD_DEPTH: BOARD_DEPTH, LUMBER_FT: LUMBER_FT,
    riserCount: riserCount, unitRise: unitRise, treadCount: treadCount,
    totalRunIn: totalRunIn, angleDeg: angleDeg, slopeIn: slopeIn,
    stringerBuyFt: stringerBuyFt, throatIn: throatIn, stringerCount: stringerCount,
    headroomIn: headroomIn, stringerGeometry: stringerGeometry, checks: checks, compute: compute
  };
}));
