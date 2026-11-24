/** MyCAREER / blacktop cartoon athletes for Court Call. */

import type { FaceDna, FaceExpression } from "@/lib/player-face";

export type SpritePose = "idle" | "run" | "shoot";

/** Continuous face morph — lerp these live; never snap discrete expressions. */
export type FaceLive = {
  /** 0 closed lips → 1 wide-open yell. */
  open: number;
  /** 0 flat → 1 full grin width. */
  smile: number;
  /** -1 furrowed / angry → 0 neutral → 1 raised surprise. */
  brow: number;
  /** 0 soft → 1 intense squint. */
  intense: number;
};

export type SpriteDrawOpts = {
  x: number;
  y: number;
  /** Pixels per court unit (already perspective-scaled in 3D mode). */
  scale: number;
  dna: FaceDna;
  jersey: string;
  jerseyDark: string;
  shorts: string;
  faceX: number;
  faceY: number;
  vx: number;
  vy: number;
  now: number;
  controlled: boolean;
  lastName: string;
  labelColor: string;
  /** Seed offset so teammates don't walk in sync. */
  phaseOffset: number;
  /** idle = open hands, run = fists, shoot = release form. */
  pose: SpritePose;
  /** Live blended face — morphs smoothly between actions. */
  faceLive: FaceLive;
  /** Stronger rim light / cylinder limbs for the 3D court camera. */
  volumetric?: boolean;
};

export function restingFaceLive(expression: FaceExpression): FaceLive {
  switch (expression) {
    case "grin":
      return { open: 0.16, smile: 0.92, brow: 0.12, intense: 0.18 };
    case "smile":
      return { open: 0.08, smile: 0.72, brow: 0.05, intense: 0.1 };
    case "open":
      return { open: 0.4, smile: 0.28, brow: 0.35, intense: 0.15 };
    case "focused":
      return { open: 0.04, smile: 0.08, brow: -0.55, intense: 0.72 };
    case "determined":
      return { open: 0.12, smile: 0.18, brow: -0.72, intense: 0.88 };
    case "smirk":
      return { open: 0.06, smile: 0.48, brow: -0.08, intense: 0.28 };
    case "cool":
      return { open: 0.14, smile: 0.58, brow: -0.12, intense: 0.22 };
    default:
      return { open: 0.05, smile: 0.12, brow: 0, intense: 0.08 };
  }
}

export function lerpFaceLive(cur: FaceLive, target: FaceLive, dt: number, rate = 8) {
  const t = 1 - Math.exp(-rate * dt);
  cur.open += (target.open - cur.open) * t;
  cur.smile += (target.smile - cur.smile) * t;
  cur.brow += (target.brow - cur.brow) * t;
  cur.intense += (target.intense - cur.intense) * t;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  dna: FaceDna,
  hx: number,
  hy: number,
  hr: number,
) {
  const c = dna.hair;
  const rim = dna.hairRim;
  ctx.fillStyle = c;
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1, hr * 0.06);

  switch (dna.hairStyle) {
    case "bald":
      return;
    case "buzz": {
      ctx.beginPath();
      ctx.ellipse(hx, hy - hr * 0.55, hr * 0.92, hr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "afro": {
      ctx.beginPath();
      ctx.arc(hx, hy - hr * 0.35, hr * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx - hr * 0.75, hy - hr * 0.15, hr * 0.45, 0, Math.PI * 2);
      ctx.arc(hx + hr * 0.75, hy - hr * 0.15, hr * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cornrows": {
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(2, hr * 0.14);
      ctx.lineCap = "round";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(hx + i * hr * 0.28, hy - hr * 0.95);
        ctx.quadraticCurveTo(
          hx + i * hr * 0.28,
          hy - hr * 0.2,
          hx + i * hr * 0.22,
          hy + hr * 0.15,
        );
        ctx.stroke();
      }
      break;
    }
    case "long": {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.95, hy - hr * 0.1);
      ctx.quadraticCurveTo(hx - hr * 1.05, hy - hr * 1.1, hx, hy - hr * 1.2);
      ctx.quadraticCurveTo(hx + hr * 1.05, hy - hr * 1.1, hx + hr * 0.95, hy - hr * 0.1);
      ctx.lineTo(hx + hr * 0.95, hy + hr * 0.55);
      ctx.quadraticCurveTo(hx + hr * 0.55, hy + hr * 0.15, hx + hr * 0.55, hy - hr * 0.1);
      ctx.lineTo(hx - hr * 0.55, hy - hr * 0.1);
      ctx.quadraticCurveTo(hx - hr * 0.55, hy + hr * 0.15, hx - hr * 0.95, hy + hr * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "curl": {
      const bumps = [
        [-0.7, -0.55, 0.38],
        [-0.25, -0.9, 0.4],
        [0.25, -0.9, 0.4],
        [0.7, -0.55, 0.38],
        [0, -0.45, 0.48],
      ] as const;
      for (const [ox, oy, rr] of bumps) {
        ctx.beginPath();
        ctx.arc(hx + ox * hr, hy + oy * hr, rr * hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    default: {
      // short / fade — spiky JJR ridges
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.95, hy - hr * 0.05);
      const spikes = 7;
      for (let i = 0; i <= spikes; i++) {
        const t = i / spikes;
        const ang = -Math.PI + t * Math.PI;
        const spike = i % 2 === 0 ? 1.22 : 0.95;
        const px = hx + Math.cos(ang) * hr * spike * 0.95;
        const py = hy + Math.sin(ang) * hr * spike * 0.85 - hr * 0.15;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(hx + hr * 0.95, hy - hr * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}

function faceMetrics(dna: FaceDna) {
  const s = dna.seed;
  return {
    jawW: 0.78 + ((s >>> 2) % 9) * 0.035,
    chinW: 0.28 + ((s >>> 5) % 8) * 0.04,
    chinDrop: 0.92 + ((s >>> 8) % 7) * 0.055,
    cheek: 0.9 + ((s >>> 11) % 6) * 0.03,
    browHeavy: ((s >>> 14) % 3) / 3,
    eyeSpread: 0.28 + ((s >>> 16) % 5) * 0.02,
    eyeRx: 0.2 + ((s >>> 18) % 5) * 0.018,
    eyeRy: 0.24 + ((s >>> 20) % 5) * 0.02,
    noseW: 0.09 + ((s >>> 22) % 4) * 0.02,
    cleft: (s >>> 24) % 4 === 0,
    pointedChin: dna.head === "oval" || (s >>> 26) % 3 === 0,
  };
}

/** Unique jaw / chin silhouette from DNA (no circular clip). */
function fillHeadShape(
  ctx: CanvasRenderingContext2D,
  dna: FaceDna,
  hx: number,
  hy: number,
  hr: number,
) {
  const m = faceMetrics(dna);
  ctx.fillStyle = dna.skin;
  ctx.beginPath();
  if (dna.head === "square") {
    // Softened “square” — rounded temples/jaw, not a box.
    const top = hy - hr * 0.98;
    const bot = hy + hr * m.chinDrop;
    const jw = hr * m.jawW * 0.98;
    const cw = hr * m.chinW * 1.05;
    ctx.moveTo(hx, top);
    ctx.bezierCurveTo(hx + jw * 0.55, top, hx + jw, hy - hr * 0.35, hx + jw, hy + hr * 0.15);
    ctx.quadraticCurveTo(hx + jw * 0.92, bot - hr * 0.12, hx + cw, bot);
    ctx.quadraticCurveTo(hx, bot + hr * 0.04, hx - cw, bot);
    ctx.quadraticCurveTo(hx - jw * 0.92, bot - hr * 0.12, hx - jw, hy + hr * 0.15);
    ctx.bezierCurveTo(hx - jw, hy - hr * 0.35, hx - jw * 0.55, top, hx, top);
  } else if (m.pointedChin || dna.head === "oval") {
    const top = hy - hr * 1.02;
    const bot = hy + hr * m.chinDrop;
    const jw = hr * m.jawW;
    const cheek = hr * m.cheek;
    ctx.moveTo(hx, top);
    ctx.bezierCurveTo(hx + cheek, top, hx + jw, hy - hr * 0.15, hx + jw, hy + hr * 0.2);
    ctx.quadraticCurveTo(hx + jw * 0.7, bot - hr * 0.05, hx, bot);
    ctx.quadraticCurveTo(hx - jw * 0.7, bot - hr * 0.05, hx - jw, hy + hr * 0.2);
    ctx.bezierCurveTo(hx - jw, hy - hr * 0.15, hx - cheek, top, hx, top);
  } else {
    const top = hy - hr;
    const bot = hy + hr * m.chinDrop * 0.95;
    const jw = hr * m.jawW * 1.02;
    ctx.moveTo(hx, top);
    ctx.bezierCurveTo(hx + jw, top, hx + jw, hy + hr * 0.35, hx + hr * m.chinW * 1.1, bot);
    ctx.quadraticCurveTo(hx, bot + hr * 0.06, hx - hr * m.chinW * 1.1, bot);
    ctx.bezierCurveTo(hx - jw, hy + hr * 0.35, hx - jw, top, hx, top);
  }
  ctx.fill();

  // Soft underside chin shade
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * (m.chinDrop - 0.15), hr * m.chinW * 1.6, hr * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  if (m.cleft) {
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = Math.max(1, hr * 0.04);
    ctx.beginPath();
    ctx.moveTo(hx, hy + hr * (m.chinDrop - 0.28));
    ctx.lineTo(hx, hy + hr * (m.chinDrop - 0.02));
    ctx.stroke();
  }
}

/** Soft lip / oral cavity — never a flat white box. */
function drawMouth(
  ctx: CanvasRenderingContext2D,
  live: FaceLive,
  mx: number,
  my: number,
  hr: number,
  shade: string,
  dna: FaceDna,
) {
  const open = Math.max(0, Math.min(1, live.open));
  const smile = Math.max(0, Math.min(1, live.smile));
  const w = hr * (0.38 + smile * 0.22 + ((dna.seed >>> 4) % 5) * 0.018);
  const lip = mixHex(dna.skin, "#8a3a42", 0.42);
  const lipDeep = mixHex(shade, "#6b2a32", 0.55);
  const cornerLift = smile * hr * 0.06 - open * hr * 0.01;
  const upperY = my - open * hr * 0.02;
  const lowerDrop = hr * (0.04 + open * 0.38 + smile * 0.04);

  // Closed / soft smile — two lip curves, no teeth slab.
  if (open < 0.12) {
    const curve = hr * (0.015 + smile * 0.14);
    ctx.strokeStyle = lipDeep;
    ctx.lineWidth = Math.max(1.4, hr * (0.055 + smile * 0.02));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.78, upperY + cornerLift * 0.2);
    ctx.quadraticCurveTo(mx - w * 0.2, upperY - hr * 0.02, mx, upperY + curve * 0.15);
    ctx.quadraticCurveTo(mx + w * 0.2, upperY - hr * 0.02, mx + w * 0.78, upperY + cornerLift * 0.2);
    ctx.stroke();
    ctx.strokeStyle = lip;
    ctx.lineWidth = Math.max(1.2, hr * 0.05);
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.72, upperY + hr * 0.015);
    ctx.quadraticCurveTo(mx, upperY + curve + hr * 0.02, mx + w * 0.72, upperY + hr * 0.015);
    ctx.stroke();
    if (smile > 0.45) {
      ctx.globalAlpha = (smile - 0.45) * 1.4;
      ctx.strokeStyle = "rgba(255,248,240,0.55)";
      ctx.lineWidth = Math.max(1, hr * 0.035);
      ctx.beginPath();
      ctx.moveTo(mx - w * 0.4, upperY + curve * 0.55);
      ctx.quadraticCurveTo(mx, upperY + curve * 0.7, mx + w * 0.4, upperY + curve * 0.55);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    return;
  }

  // Open mouth — organic oval cavity + lip volume + arched teeth strip.
  const cavityH = lowerDrop * 0.92;
  const cavityW = w * (0.72 + open * 0.12);

  ctx.fillStyle = "#1c0c0a";
  ctx.beginPath();
  ctx.moveTo(mx - cavityW, upperY + hr * 0.02);
  ctx.bezierCurveTo(
    mx - cavityW * 0.55,
    upperY - hr * 0.02,
    mx + cavityW * 0.55,
    upperY - hr * 0.02,
    mx + cavityW,
    upperY + hr * 0.02,
  );
  ctx.bezierCurveTo(
    mx + cavityW * 1.05,
    upperY + cavityH * 0.55,
    mx + cavityW * 0.7,
    upperY + cavityH,
    mx,
    upperY + cavityH,
  );
  ctx.bezierCurveTo(
    mx - cavityW * 0.7,
    upperY + cavityH,
    mx - cavityW * 1.05,
    upperY + cavityH * 0.55,
    mx - cavityW,
    upperY + hr * 0.02,
  );
  ctx.closePath();
  ctx.fill();

  // Tongue
  if (open > 0.28) {
    ctx.globalAlpha = 0.55 + open * 0.35;
    ctx.fillStyle = "#c45c6a";
    ctx.beginPath();
    ctx.ellipse(
      mx,
      upperY + cavityH * (0.62 + open * 0.08),
      cavityW * 0.55,
      cavityH * 0.28,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Upper teeth — thin arched ribbon, not a rectangle
  if (open > 0.16) {
    const teethTop = upperY + hr * 0.04;
    const teethH = hr * (0.05 + Math.min(0.1, open * 0.12));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mx - cavityW * 0.88, teethTop);
    ctx.quadraticCurveTo(mx, teethTop - hr * 0.015, mx + cavityW * 0.88, teethTop);
    ctx.lineTo(mx + cavityW * 0.78, teethTop + teethH);
    ctx.quadraticCurveTo(mx, teethTop + teethH + hr * 0.02, mx - cavityW * 0.78, teethTop + teethH);
    ctx.closePath();
    ctx.clip();
    const tg = ctx.createLinearGradient(mx, teethTop, mx, teethTop + teethH);
    tg.addColorStop(0, "#fffef9");
    tg.addColorStop(0.55, "#f0e6d8");
    tg.addColorStop(1, "#d9cbb8");
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = "rgba(90,60,45,0.22)";
    ctx.lineWidth = Math.max(0.6, hr * 0.025);
    const n = 5;
    for (let i = 1; i < n; i++) {
      const tx = mx - cavityW * 0.7 + (i / n) * cavityW * 1.4;
      ctx.beginPath();
      ctx.moveTo(tx, teethTop + hr * 0.008);
      ctx.lineTo(tx, teethTop + teethH - hr * 0.008);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Upper lip (cupid's bow)
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.moveTo(mx - w * 0.95, upperY + hr * 0.04);
  ctx.quadraticCurveTo(mx - w * 0.35, upperY - hr * 0.06, mx - w * 0.08, upperY - hr * 0.01);
  ctx.quadraticCurveTo(mx, upperY - hr * 0.045, mx + w * 0.08, upperY - hr * 0.01);
  ctx.quadraticCurveTo(mx + w * 0.35, upperY - hr * 0.06, mx + w * 0.95, upperY + hr * 0.04);
  ctx.quadraticCurveTo(mx, upperY + hr * 0.05, mx - w * 0.95, upperY + hr * 0.04);
  ctx.fill();

  // Lower lip
  ctx.fillStyle = lipDeep;
  ctx.beginPath();
  ctx.moveTo(mx - w * 0.88, upperY + cavityH * 0.72);
  ctx.quadraticCurveTo(mx, upperY + cavityH * 1.12, mx + w * 0.88, upperY + cavityH * 0.72);
  ctx.quadraticCurveTo(mx, upperY + cavityH * 0.85, mx - w * 0.88, upperY + cavityH * 0.72);
  ctx.fill();
  ctx.fillStyle = "rgba(255,200,190,0.28)";
  ctx.beginPath();
  ctx.ellipse(mx, upperY + cavityH * 0.88, w * 0.35, hr * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Cheap skin/lip blend without pulling in a color lib. */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const m = (i: number) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function parseHex(c: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawDetailedEye(
  ctx: CanvasRenderingContext2D,
  dna: FaceDna,
  ex: number,
  ey: number,
  rx: number,
  ry: number,
  side: -1 | 1,
  hr: number,
  intense: number,
) {
  const squint = Math.max(0, Math.min(1, intense));
  const eyeRy = ry * (1 - squint * 0.38);
  const lidDrop = squint * ry * 0.35;

  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.beginPath();
  ctx.ellipse(ex, ey + eyeRy * 0.15, rx * 1.15, eyeRy * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fffcf7";
  ctx.beginPath();
  ctx.ellipse(ex, ey, rx, eyeRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,18,12,0.22)";
  ctx.lineWidth = Math.max(1, hr * 0.035);
  ctx.stroke();

  const irisR = Math.min(rx, eyeRy) * 0.72;
  const ix = ex + side * rx * 0.08;
  const iy = ey + eyeRy * 0.06;

  ctx.fillStyle = dna.eye;
  ctx.beginPath();
  ctx.arc(ix, iy, irisR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = Math.max(1, irisR * 0.18);
  ctx.beginPath();
  ctx.arc(ix, iy, irisR * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, irisR * 0.12);
  ctx.beginPath();
  ctx.arc(ix, iy, irisR * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#0a0604";
  ctx.beginPath();
  ctx.arc(ix, iy, irisR * (0.38 + squint * 0.08), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(ix - irisR * 0.28, iy - irisR * 0.32, irisR * 0.28, irisR * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix + irisR * 0.22, iy + irisR * 0.18, irisR * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Upper lid — drops with intensity
  ctx.strokeStyle = "rgba(20,12,8,0.45)";
  ctx.lineWidth = Math.max(1.5, hr * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ex - rx * 1.05, ey - eyeRy * 0.15 + lidDrop * 0.4);
  ctx.quadraticCurveTo(ex, ey - eyeRy * 1.15 + lidDrop, ex + rx * 1.05, ey - eyeRy * 0.15 + lidDrop * 0.4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,12,8,0.18)";
  ctx.lineWidth = Math.max(1, hr * 0.04);
  ctx.beginPath();
  ctx.moveTo(ex - rx * 0.9, ey - eyeRy * 0.55 + lidDrop * 0.5);
  ctx.quadraticCurveTo(ex, ey - eyeRy * 1.35 + lidDrop, ex + rx * 0.9, ey - eyeRy * 0.55 + lidDrop * 0.5);
  ctx.stroke();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  dna: FaceDna,
  hx: number,
  hy: number,
  hr: number,
  live: FaceLive,
) {
  const m = faceMetrics(dna);

  ctx.fillStyle = dna.skinShade;
  ctx.beginPath();
  ctx.ellipse(hx - hr * m.jawW * 1.02, hy + hr * 0.02, hr * 0.2, hr * 0.3, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * m.jawW * 1.02, hy + hr * 0.02, hr * 0.2, hr * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dna.skin;
  ctx.beginPath();
  ctx.ellipse(hx - hr * m.jawW * 1.02, hy + hr * 0.02, hr * 0.12, hr * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * m.jawW * 1.02, hy + hr * 0.02, hr * 0.12, hr * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  fillHeadShape(ctx, dna, hx, hy, hr);

  ctx.fillStyle = "rgba(220,90,70,0.12)";
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.48, hy + hr * 0.22, hr * 0.22, hr * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * 0.48, hy + hr * 0.22, hr * 0.22, hr * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  const hl = ctx.createLinearGradient(hx, hy - hr, hx, hy);
  hl.addColorStop(0, "rgba(255,255,255,0.22)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.35, hr * 0.55, hr * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  drawHair(ctx, dna, hx, hy, hr);

  // Brows follow live.brow continuously
  const browAmt = Math.max(-1, Math.min(1, live.brow));
  const browThick = Math.max(2.4, hr * (0.12 + m.browHeavy * 0.08));
  ctx.strokeStyle = dna.brow;
  ctx.lineWidth = browThick;
  ctx.lineCap = "round";
  const browY = hy - hr * (0.36 - browAmt * 0.06);
  // Negative brow = inner ends drop (furrow); positive = outer lift (surprise)
  const innerTilt = -browAmt * 0.1;
  const outerTilt = browAmt < 0 ? -browAmt * 0.14 : browAmt * 0.04;
  ctx.beginPath();
  ctx.moveTo(hx - hr * (m.eyeSpread + 0.28), browY + hr * outerTilt);
  ctx.quadraticCurveTo(
    hx - hr * m.eyeSpread,
    browY - hr * 0.12 + hr * innerTilt,
    hx - hr * 0.08,
    browY + hr * (0.02 - innerTilt),
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + hr * (m.eyeSpread + 0.28), browY + hr * outerTilt);
  ctx.quadraticCurveTo(
    hx + hr * m.eyeSpread,
    browY - hr * 0.12 + hr * innerTilt,
    hx + hr * 0.08,
    browY + hr * (0.02 - innerTilt),
  );
  ctx.stroke();

  const eyeY = hy - hr * 0.04;
  for (const side of [-1, 1] as const) {
    drawDetailedEye(
      ctx,
      dna,
      hx + side * hr * m.eyeSpread,
      eyeY,
      hr * m.eyeRx,
      hr * m.eyeRy,
      side,
      hr,
      live.intense,
    );
  }

  ctx.fillStyle = dna.skinShade;
  ctx.beginPath();
  ctx.moveTo(hx, hy + hr * 0.02);
  ctx.lineTo(hx - hr * m.noseW, hy + hr * 0.3);
  ctx.quadraticCurveTo(hx, hy + hr * 0.36, hx + hr * m.noseW, hy + hr * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.02, hy + hr * 0.14, hr * 0.04, hr * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dna.facial !== "none") {
    ctx.fillStyle = dna.hair;
    if (dna.facial === "stubble") {
      ctx.globalAlpha = 0.34;
      ctx.beginPath();
      ctx.ellipse(hx, hy + hr * 0.58, hr * 0.58, hr * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (dna.facial === "mustache") {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.3, hy + hr * 0.4);
      ctx.quadraticCurveTo(hx, hy + hr * 0.55, hx + hr * 0.3, hy + hr * 0.4);
      ctx.quadraticCurveTo(hx, hy + hr * 0.46, hx - hr * 0.3, hy + hr * 0.4);
      ctx.fill();
    } else if (dna.facial === "goatee") {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.15, hy + hr * 0.48);
      ctx.quadraticCurveTo(hx, hy + hr * m.chinDrop * 0.95, hx + hr * 0.15, hy + hr * 0.48);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.58, hy + hr * 0.42);
      ctx.quadraticCurveTo(hx, hy + hr * (m.chinDrop + 0.05), hx + hr * 0.58, hy + hr * 0.42);
      ctx.quadraticCurveTo(hx, hy + hr * 0.72, hx - hr * 0.58, hy + hr * 0.42);
      ctx.fill();
    }
  }

  drawMouth(ctx, live, hx, hy + hr * 0.5, hr, dna.skinShade, dna);
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mode: "open" | "fist" | "shoot",
  skin: string,
  shade: string,
  size: number,
  ang: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  if (mode === "fist") {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.55, size * 0.52, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade;
    for (let i = -1.5; i <= 1.5; i++) {
      ctx.beginPath();
      ctx.ellipse(i * size * 0.26, -size * 0.32, size * 0.14, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(-size * 0.48, size * 0.08, size * 0.26, size * 0.2, -0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Open / shoot — palm + fingers
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.1, size * 0.48, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    const spread = mode === "shoot" ? 0.38 : 0.28;
    const len = mode === "shoot" ? size * 0.85 : size * 0.7;
    for (let i = -1.5; i <= 1.5; i++) {
      const fx = i * size * spread;
      ctx.beginPath();
      ctx.ellipse(fx, -size * 0.35, size * 0.14, len * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Thumb
    ctx.beginPath();
    ctx.ellipse(-size * 0.55, size * 0.05, size * 0.2, size * 0.32, -0.7, 0, Math.PI * 2);
    ctx.fill();
    // Palm crease
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.05);
    ctx.quadraticCurveTo(0, size * 0.25, size * 0.3, 0);
    ctx.stroke();
  }
  ctx.restore();
}

type LimbPose = {
  side: -1 | 1;
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  footX: number;
  footY: number;
  shoulderX: number;
  shoulderY: number;
  elbowX: number;
  elbowY: number;
  handX: number;
  handY: number;
  /** Along facing — higher = more forward = draw later. */
  depth: number;
};

/** Map a sagittal (forward, down) offset onto screen while the sprite stays upright. */
function projectSagittal(
  forward: number,
  down: number,
  fwdX: number,
  fwdY: number,
  baseX: number,
  baseY: number,
) {
  return {
    x: baseX + forward * fwdX,
    y: baseY + down + forward * fwdY,
  };
}

/**
 * Sagittal walk: limbs swing forward/back along facing, not out to the sides.
 * Uses eased hip/knee curves so plant → push → swing reads smoother.
 */
function gaitLimbs(
  phase: number,
  strideAmt: number,
  torsoW: number,
  torsoH: number,
  ty: number,
  thighLen: number,
  shinLen: number,
  upperArm: number,
  foreArm: number,
  faceX: number,
  faceY: number,
  idleSway = 0,
): LimbPose[] {
  const hipY = torsoH * 0.38;
  const shoulderY = ty + torsoH * 0.2;
  const fl = Math.hypot(faceX, faceY) || 1;
  let fwdX = faceX / fl;
  let fwdY = faceY / fl;
  if (Math.hypot(fwdX, fwdY) < 0.2) {
    fwdX = 0;
    fwdY = -1;
  }
  const rightX = -fwdY;
  const rightY = fwdX;

  const poses: LimbPose[] = [];

  for (const side of [-1, 1] as const) {
    const p = phase + (side === 1 ? Math.PI : 0);
    // Smoothstep-ish swing — less robotic than raw sin peaks.
    const swing = Math.sin(p);
    const swing2 = Math.sin(p * 2);
    const hipAngle = (swing * 1.05 + idleSway * 0.12 * side) * strideAmt;
    // Bend most through mid-swing; ease near plant.
    const plant = Math.max(0, Math.cos(p));
    const lift = Math.max(0, -Math.cos(p));
    const kneeBend =
      0.22 +
      (0.42 + plant * 0.55 + lift * 0.75 + Math.max(0, -swing) * 0.2) * strideAmt;
    const shinAngle = hipAngle - kneeBend;

    const seat = torsoW * (0.11 + Math.abs(swing) * 0.015 * strideAmt) * side;
    const hipX = seat * rightX;
    const hipY0 = hipY + seat * rightY * 0.15 + plant * 0.04 * strideAmt * thighLen * 0.15;
    const thigh = projectSagittal(
      Math.sin(hipAngle) * thighLen,
      Math.cos(hipAngle) * thighLen,
      fwdX,
      fwdY,
      hipX,
      hipY0,
    );
    let shin = projectSagittal(
      Math.sin(shinAngle) * shinLen,
      Math.cos(shinAngle) * shinLen,
      fwdX,
      fwdY,
      thigh.x,
      thigh.y,
    );
    // Flatten foot slightly on plant so steps feel grounded.
    if (plant > 0.55 && strideAmt > 0.4) {
      shin = {
        x: shin.x + fwdX * plant * 0.08 * shinLen,
        y: shin.y + plant * 0.04 * shinLen,
      };
    }

    const ap = p + Math.PI;
    const armSwing = Math.sin(ap);
    const armSeat = torsoW * 0.46 * side;
    const shoulderX = armSeat * rightX + idleSway * rightX * 0.04 * side;
    const shoulderY0 =
      shoulderY + armSeat * rightY * 0.1 - Math.max(0, armSwing) * 0.06 * strideAmt * upperArm;
    const armAngle = (armSwing * 0.82 + swing2 * 0.06) * strideAmt + idleSway * 0.08 * side;
    const elbowBend =
      0.32 + Math.max(0, armSwing) * 0.5 * strideAmt + (1 - strideAmt) * 0.18;
    const elbow = projectSagittal(
      Math.sin(armAngle) * upperArm,
      Math.cos(armAngle) * upperArm * (0.95 + strideAmt * 0.05),
      fwdX,
      fwdY,
      shoulderX,
      shoulderY0,
    );
    const hand = projectSagittal(
      Math.sin(armAngle - elbowBend) * foreArm,
      Math.cos(armAngle - elbowBend) * foreArm,
      fwdX,
      fwdY,
      elbow.x,
      elbow.y,
    );

    const forwardAmt = Math.sin(hipAngle) + Math.sin(armAngle) * 0.2;
    poses.push({
      side,
      hipX,
      hipY: hipY0,
      kneeX: thigh.x,
      kneeY: thigh.y,
      footX: shin.x,
      footY: shin.y,
      shoulderX,
      shoulderY: shoulderY0,
      elbowX: elbow.x,
      elbowY: elbow.y,
      handX: hand.x,
      handY: hand.y,
      depth: forwardAmt,
    });
  }
  return poses;
}

function strokeLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  color: string,
  shade?: string,
) {
  // Soft under-stroke for thickness / occlusion
  if (shade) {
    ctx.strokeStyle = shade;
    ctx.lineWidth = width * 1.18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  // Specular ridge along the limb for a 3D cylinder read
  if (shade) {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const nl = Math.hypot(nx, ny) || 1;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = Math.max(1, width * 0.22);
    ctx.beginPath();
    ctx.moveTo(x0 + (nx / nl) * width * 0.18, y0 + (ny / nl) * width * 0.18);
    ctx.lineTo(x1 + (nx / nl) * width * 0.18, y1 + (ny / nl) * width * 0.18);
    ctx.stroke();
    void mx;
    void my;
  }
}

/**
 * Draw a MyCAREER / blacktop cartoon athlete: tall athletic build, big
 * expressive head, sleeveless jersey, baggy shorts, chunky white sneakers.
 * `x,y` is the gameplay center (torso); feet sit below on the court.
 */
export function drawCourtCallSprite(
  ctx: CanvasRenderingContext2D,
  opts: SpriteDrawOpts,
) {
  const {
    x,
    y,
    scale,
    dna,
    jersey,
    jerseyDark,
    shorts,
    faceX,
    faceY,
    vx,
    vy,
    now,
    controlled,
    lastName,
    labelColor,
    phaseOffset,
    pose,
    faceLive,
    volumetric = false,
  } = opts;

  const s = scale;
  const speed = Math.hypot(vx, vy);
  const moving = pose === "run" || speed > 1.4;
  const strideAmt =
    pose === "shoot" ? 0.08 : moving ? Math.min(1.05, 0.35 + speed / 9) : 0.12;
  // Cadence tracks speed so sprinting doesn't look like a slow jog.
  const cadence =
    pose === "shoot" ? 0.6 : moving ? 1.05 + Math.min(1.35, speed / 7.5) : 0.55;
  const phase = (now / 1000) * cadence * Math.PI * 2 + phaseOffset;
  const idleSway = Math.sin(now / 420 + phaseOffset) * (moving ? 0.25 : 1);
  const footPulse = Math.pow(Math.abs(Math.sin(phase)), 1.35);
  const bob =
    (moving && pose !== "shoot"
      ? footPulse * 0.22 * strideAmt + Math.sin(phase) * 0.03
      : Math.sin(now / 380) * 0.045 + idleSway * 0.02) * s;
  const lean = moving && pose !== "shoot" ? Math.min(0.14, speed / 55) : 0;

  // Athletic proportions — slightly taller/thicker in volumetric mode.
  const v = volumetric ? 1.12 : 1;
  const headR = 1.68 * s * (volumetric ? 1.04 : 1);
  const torsoW = 2.05 * s * v;
  const torsoH = 2.1 * s * v;
  const thighLen = 1.18 * s * v;
  const shinLen = 1.08 * s * v;
  const legSpan = thighLen + shinLen;
  const legW = 0.58 * s * v;
  const upperArm = 0.95 * s * v;
  const foreArm = 0.84 * s * v;
  const armW = 0.46 * s * v;
  const shoeR = 0.48 * s * v;
  const handSize = armW * 0.95;

  const cx = x;
  const cy = y + bob;
  const ty = -torsoH * 0.42;

  const fl = Math.hypot(faceX, faceY) || 1;
  const fwdX = faceX / fl;
  const fwdY = faceY / fl;

  const limbs = gaitLimbs(
    phase,
    strideAmt,
    torsoW,
    torsoH,
    ty,
    thighLen,
    shinLen,
    upperArm,
    foreArm,
    faceX,
    faceY,
    idleSway,
  );

  if (pose === "shoot") {
    for (const limb of limbs) {
      const isShootHand = limb.side === 1;
      if (isShootHand) {
        limb.elbowX = limb.shoulderX + fwdX * upperArm * 0.3;
        limb.elbowY = limb.shoulderY - upperArm * 1.05;
        limb.handX = limb.elbowX + fwdX * foreArm * 0.45;
        limb.handY = limb.elbowY - foreArm * 0.95;
      } else {
        limb.elbowX = limb.shoulderX + fwdX * upperArm * 0.35;
        limb.elbowY = limb.shoulderY - upperArm * 0.4;
        limb.handX = limb.elbowX + fwdX * foreArm * 0.55;
        limb.handY = limb.elbowY - foreArm * 0.2;
      }
      limb.depth = isShootHand ? 2 : 1;
    }
  }

  const sorted = [...limbs].sort((a, b) => a.depth - b.depth);
  const back = sorted[0]!;
  const front = sorted[1]!;

  const handMode: "open" | "fist" | "shoot" =
    pose === "shoot" ? "shoot" : pose === "run" ? "fist" : "open";

  ctx.save();

  // Soft ground contact shadow (perspective footprint).
  ctx.fillStyle = volumetric ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy + torsoH * 0.55 + legSpan + shoeR * 0.4,
    torsoW * (volumetric ? 1.15 : 0.95),
    (volumetric ? 0.42 : 0.55) * s,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (controlled) {
    const pulse = 0.35 + Math.sin(now / 140) * 0.22;
    ctx.strokeStyle = `rgba(255,247,237,${pulse})`;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy + torsoH * 0.55 + legSpan + shoeR * 0.4,
      torsoW * 1.15,
      0.68 * s,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.translate(cx, cy);
  if (lean > 0.01) {
    ctx.transform(1, lean * fwdY * 0.35, lean * fwdX * 0.5, 1, 0, 0);
  }

  const drawSneaker = (limb: LimbPose) => {
    const ang = Math.atan2(fwdY, fwdX);
    const sx = limb.footX + fwdX * shoeR * 0.35;
    const sy = limb.footY + shoeR * 0.15;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang * 0.35);
    // Sole
    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.ellipse(0, shoeR * 0.15, shoeR * 1.55, shoeR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // White upper
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(shoeR * 0.1, -shoeR * 0.05, shoeR * 1.35, shoeR * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    // Toe cap
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(shoeR * 0.85, 0, shoeR * 0.55, shoeR * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Accent swoosh
    ctx.strokeStyle = jersey;
    ctx.lineWidth = Math.max(1.5, shoeR * 0.22);
    ctx.beginPath();
    ctx.moveTo(-shoeR * 0.55, shoeR * 0.05);
    ctx.quadraticCurveTo(0, -shoeR * 0.35, shoeR * 0.7, -shoeR * 0.05);
    ctx.stroke();
    // Lace dots
    ctx.fillStyle = "#94a3b8";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-shoeR * 0.15 + i * shoeR * 0.28, -shoeR * 0.22, shoeR * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawLeg = (limb: LimbPose) => {
    // Shorts overhang
    strokeLimb(
      ctx,
      limb.hipX,
      limb.hipY * 0.15,
      limb.kneeX,
      limb.kneeY,
      legW,
      shorts,
      volumetric ? jerseyDark : undefined,
    );
    // Calf
    strokeLimb(
      ctx,
      limb.kneeX,
      limb.kneeY,
      limb.footX,
      limb.footY - shoeR * 0.35,
      legW * 0.88,
      dna.skin,
      volumetric ? dna.skinShade : undefined,
    );
    ctx.fillStyle = dna.skinShade;
    ctx.beginPath();
    ctx.arc(limb.kneeX, limb.kneeY, legW * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Sock
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.ellipse(
      limb.footX,
      limb.footY - shoeR * 0.55,
      legW * 0.42,
      shoeR * 0.45,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    drawSneaker(limb);
  };

  const drawArm = (limb: LimbPose) => {
    // Deltoid / jersey sleeve cut
    ctx.fillStyle = jerseyDark;
    ctx.beginPath();
    ctx.arc(limb.shoulderX, limb.shoulderY, armW * 0.85, 0, Math.PI * 2);
    ctx.fill();
    strokeLimb(
      ctx,
      limb.shoulderX,
      limb.shoulderY,
      limb.elbowX,
      limb.elbowY,
      armW * 1.05,
      dna.skin,
      volumetric ? dna.skinShade : undefined,
    );
    strokeLimb(
      ctx,
      limb.elbowX,
      limb.elbowY,
      limb.handX,
      limb.handY,
      armW * 0.92,
      dna.skin,
      volumetric ? dna.skinShade : undefined,
    );
    // Bicep highlight
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(
      (limb.shoulderX + limb.elbowX) / 2 - armW * 0.12,
      (limb.shoulderY + limb.elbowY) / 2,
      armW * 0.28,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = dna.skinShade;
    ctx.beginPath();
    ctx.arc(limb.elbowX, limb.elbowY, armW * 0.38, 0, Math.PI * 2);
    ctx.fill();
    const handAng =
      Math.atan2(limb.handY - limb.elbowY, limb.handX - limb.elbowX) + Math.PI / 2;
    drawHand(
      ctx,
      limb.handX,
      limb.handY,
      handMode,
      dna.skin,
      dna.skinShade,
      handSize,
      handAng,
    );
  };

  drawLeg(back);
  drawArm(back);

  // Athletic jersey silhouette (shoulders wide → waist tapered — not a box).
  const shoulder = torsoW * 0.5;
  const waist = torsoW * 0.36;
  const hem = torsoW * 0.42;
  const jerseyGrad = ctx.createLinearGradient(-shoulder, ty, shoulder, ty + torsoH);
  jerseyGrad.addColorStop(0, jersey);
  jerseyGrad.addColorStop(0.4, jersey);
  jerseyGrad.addColorStop(0.75, jerseyDark);
  jerseyGrad.addColorStop(1, jerseyDark);
  ctx.fillStyle = jerseyGrad;
  ctx.beginPath();
  ctx.moveTo(-shoulder * 0.92, ty + torsoH * 0.08);
  ctx.quadraticCurveTo(-shoulder, ty, -shoulder * 0.55, ty);
  ctx.lineTo(shoulder * 0.55, ty);
  ctx.quadraticCurveTo(shoulder, ty, shoulder * 0.92, ty + torsoH * 0.08);
  ctx.quadraticCurveTo(waist * 1.05, ty + torsoH * 0.55, hem, ty + torsoH * 0.72);
  ctx.quadraticCurveTo(0, ty + torsoH * 0.76, -hem, ty + torsoH * 0.72);
  ctx.quadraticCurveTo(-waist * 1.05, ty + torsoH * 0.55, -shoulder * 0.92, ty + torsoH * 0.08);
  ctx.closePath();
  ctx.fill();
  if (volumetric) {
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.moveTo(shoulder * 0.35, ty + torsoH * 0.1);
    ctx.quadraticCurveTo(shoulder * 0.95, ty + torsoH * 0.2, hem * 0.9, ty + torsoH * 0.7);
    ctx.quadraticCurveTo(waist * 0.4, ty + torsoH * 0.45, shoulder * 0.35, ty + torsoH * 0.1);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.ellipse(-torsoW * 0.08, ty + torsoH * 0.32, torsoW * 0.18, torsoH * 0.22, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Neck scoop
  ctx.fillStyle = dna.skin;
  ctx.beginPath();
  ctx.ellipse(0, ty + torsoH * 0.02, torsoW * 0.2, torsoH * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  ctx.ellipse(0, ty + torsoH * 0.07, torsoW * 0.26, torsoH * 0.12, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  // Soft side panels along the taper
  ctx.fillStyle = jerseyDark;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-shoulder * 0.88, ty + torsoH * 0.16);
  ctx.lineTo(-shoulder * 0.62, ty + torsoH * 0.18);
  ctx.lineTo(-hem * 0.85, ty + torsoH * 0.68);
  ctx.lineTo(-hem, ty + torsoH * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(shoulder * 0.88, ty + torsoH * 0.16);
  ctx.lineTo(shoulder * 0.62, ty + torsoH * 0.18);
  ctx.lineTo(hem * 0.85, ty + torsoH * 0.68);
  ctx.lineTo(hem, ty + torsoH * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Baggy shorts with curved hem
  const shortsTop = ty + torsoH * 0.58;
  const shortsBot = ty + torsoH * 1.12;
  const shortsGrad = ctx.createLinearGradient(0, shortsTop, 0, shortsBot);
  shortsGrad.addColorStop(0, shorts);
  shortsGrad.addColorStop(1, jerseyDark);
  ctx.fillStyle = shortsGrad;
  ctx.beginPath();
  ctx.moveTo(-torsoW * 0.52, shortsTop + torsoH * 0.04);
  ctx.quadraticCurveTo(-torsoW * 0.55, shortsTop, -torsoW * 0.2, shortsTop);
  ctx.lineTo(torsoW * 0.2, shortsTop);
  ctx.quadraticCurveTo(torsoW * 0.55, shortsTop, torsoW * 0.52, shortsTop + torsoH * 0.04);
  ctx.quadraticCurveTo(torsoW * 0.58, shortsBot - torsoH * 0.08, torsoW * 0.42, shortsBot);
  ctx.quadraticCurveTo(0, shortsBot + torsoH * 0.04, -torsoW * 0.42, shortsBot);
  ctx.quadraticCurveTo(-torsoW * 0.58, shortsBot - torsoH * 0.08, -torsoW * 0.52, shortsTop + torsoH * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, shortsTop + torsoH * 0.05, torsoW * 0.48, torsoH * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, shortsTop + torsoH * 0.12);
  ctx.quadraticCurveTo(torsoW * 0.02, shortsBot * 0.5 + shortsTop * 0.5, 0, shortsBot - torsoH * 0.04);
  ctx.stroke();

  drawLeg(front);
  drawArm(front);

  // Neck (tapered) then head
  const hx = 0;
  const hy = ty - headR * 0.52;
  ctx.fillStyle = dna.skin;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.22, hy + headR * 0.78);
  ctx.lineTo(headR * 0.22, hy + headR * 0.78);
  ctx.quadraticCurveTo(headR * 0.3, hy + headR * 1.05, headR * 0.26, hy + headR * 1.12);
  ctx.lineTo(-headR * 0.26, hy + headR * 1.12);
  ctx.quadraticCurveTo(-headR * 0.3, hy + headR * 1.05, -headR * 0.22, hy + headR * 0.78);
  ctx.closePath();
  ctx.fill();
  drawFace(ctx, dna, hx, hy, headR, faceLive);

  ctx.restore();

  const labelY = cy + torsoH * 0.55 + legSpan + shoeR + 5;
  const fontSize = Math.max(10, Math.round(1.05 * s));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(12,8,6,0.9)";
  ctx.strokeText(lastName, cx, labelY);
  ctx.fillStyle = labelColor;
  ctx.fillText(lastName, cx, labelY);
}
