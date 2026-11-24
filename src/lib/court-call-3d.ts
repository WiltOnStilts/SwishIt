/**
 * High-angle sideline camera for Court Call — looks down onto the floor
 * so the court reads compact and players stay readable.
 * Court (laneX 0–50, alongY 0–94) → world (x=along, y=up, z=lane).
 */

export type Vec3 = { x: number; y: number; z: number };

export type Projected = {
  x: number;
  y: number;
  /** Pixel scale for a 1-world-unit object at this depth. */
  scale: number;
  /** Larger = farther; use for painter's algorithm. */
  depth: number;
};

export type Camera3D = {
  /** Follow point along court length (court Y). */
  along: number;
  /** Follow point across court width (court X). */
  lane: number;
};

const CAM_HEIGHT = 56;
/** How far outside the near sideline the camera sits (world Z). */
const CAM_OUTSIDE = 16;
/** Point on the court width the camera aims at. */
const LOOK_AT_LANE = 25;
/** Lower = zoomed out (more court on screen). */
const FOV = 720;

export function courtToWorld(
  laneX: number,
  alongY: number,
  up = 0,
): Vec3 {
  return { x: alongY, y: up, z: laneX };
}

/**
 * Look-at projection from outside the sideline, angled down at the floor.
 * Guarantees typical court points stay in front of the near plane.
 */
export function projectWorld(
  p: Vec3,
  cam: Camera3D,
  screenW: number,
  screenH: number,
): Projected | null {
  const eye: Vec3 = {
    x: cam.along,
    y: CAM_HEIGHT,
    z: -CAM_OUTSIDE,
  };
  const target: Vec3 = {
    x: cam.along,
    y: 0,
    z: LOOK_AT_LANE,
  };

  // Basis: forward, right, up
  let fx = target.x - eye.x;
  let fy = target.y - eye.y;
  let fz = target.z - eye.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;

  // right = normalize(forward × worldUp)
  let rx = -fz;
  let ry = 0;
  let rz = fx;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  rz /= rl;

  // up = right × forward
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;

  const dx = p.x - eye.x;
  const dy = p.y - eye.y;
  const dz = p.z - eye.z;

  const cx = dx * rx + dy * ry + dz * rz;
  const cy = dx * ux + dy * uy + dz * uz;
  const cz = dx * fx + dy * fy + dz * fz;

  if (cz < 3) return null;

  const scale = FOV / cz;
  return {
    x: screenW * 0.5 + cx * scale,
    y: screenH * 0.52 - cy * scale,
    scale,
    depth: cz,
  };
}

export function projectCourt(
  laneX: number,
  alongY: number,
  cam: Camera3D,
  screenW: number,
  screenH: number,
  up = 0,
): Projected | null {
  return projectWorld(courtToWorld(laneX, alongY, up), cam, screenW, screenH);
}

/**
 * Project a ground quad. If a corner is barely behind the camera, nudge it
 * forward instead of aborting the whole floor (which left a blank blue sky).
 */
export function projectGroundPoly(
  corners: Array<[number, number]>,
  cam: Camera3D,
  screenW: number,
  screenH: number,
): Array<{ x: number; y: number }> | null {
  const pts: Array<{ x: number; y: number }> = [];
  for (const [lane, along] of corners) {
    let p = projectCourt(lane, along, cam, screenW, screenH, 0);
    if (!p) {
      // Nudge toward camera look-at so sideline overhang still draws.
      p = projectCourt(
        Math.max(0, Math.min(50, lane * 0.5 + LOOK_AT_LANE * 0.5)),
        along,
        cam,
        screenW,
        screenH,
        0,
      );
    }
    if (!p) return null;
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

export function fillProjectedPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i]!.x, pts[i]!.y);
  }
  ctx.closePath();
  ctx.fill();
}

export function strokeProjectedPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i]!.x, pts[i]!.y);
  }
  ctx.closePath();
  ctx.stroke();
}

export function strokeProjectedLine(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
