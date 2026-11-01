/** Jetpack Joyride–style chibi basketball sprites for Court Call. */

import type { FaceDna, FaceExpression } from "@/lib/player-face";

export type SpritePose = "idle" | "run" | "shoot";

export type SpriteDrawOpts = {
  x: number;
  y: number;
  /** Pixels per court unit. */
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
};

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
    const top = hy - hr * 0.95;
    const bot = hy + hr * m.chinDrop;
    const jw = hr * m.jawW;
    const cw = hr * m.chinW;
    ctx.moveTo(hx - jw * 0.85, top + hr * 0.15);
    ctx.quadraticCurveTo(hx - jw * 0.9, top, hx - jw * 0.45, top);
    ctx.lineTo(hx + jw * 0.45, top);
    ctx.quadraticCurveTo(hx + jw * 0.9, top, hx + jw * 0.85, top + hr * 0.15);
    ctx.lineTo(hx + jw, hy + hr * 0.25);
    ctx.quadraticCurveTo(hx + jw * 0.95, bot - hr * 0.1, hx + cw, bot);
    ctx.lineTo(hx - cw, bot);
    ctx.quadraticCurveTo(hx - jw * 0.95, bot - hr * 0.1, hx - jw, hy + hr * 0.25);
    ctx.closePath();
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

function drawMouth(
  ctx: CanvasRenderingContext2D,
  expression: FaceExpression,
  mx: number,
  my: number,
  hr: number,
  shade: string,
  dna: FaceDna,
) {
  const w = hr * (0.48 + ((dna.seed >>> 4) % 5) * 0.025);
  const toothy =
    expression === "grin" ||
    expression === "open" ||
    expression === "smile" ||
    expression === "cool";

  if (toothy) {
    const deep = expression === "open" || expression === "grin";
    // Cavity
    ctx.fillStyle = "#1a0e0a";
    ctx.beginPath();
    ctx.moveTo(mx - w, my);
    ctx.quadraticCurveTo(mx, my + hr * (deep ? 0.42 : 0.3), mx + w, my);
    ctx.quadraticCurveTo(mx, my + hr * 0.08, mx - w, my);
    ctx.closePath();
    ctx.fill();

    // Gum line
    ctx.fillStyle = "#c45c6a";
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.92, my + hr * 0.01);
    ctx.quadraticCurveTo(mx, my + hr * 0.06, mx + w * 0.92, my + hr * 0.01);
    ctx.quadraticCurveTo(mx, my + hr * 0.02, mx - w * 0.92, my + hr * 0.01);
    ctx.fill();

    // Teeth plate
    const teethTop = my + hr * 0.04;
    const teethBot = my + hr * (deep ? 0.22 : 0.16);
    ctx.fillStyle = "#fffef8";
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.9, teethTop);
    ctx.lineTo(mx + w * 0.9, teethTop);
    ctx.lineTo(mx + w * 0.82, teethBot);
    ctx.quadraticCurveTo(mx, teethBot + hr * 0.02, mx - w * 0.82, teethBot);
    ctx.closePath();
    ctx.fill();

    // Individual teeth
    ctx.strokeStyle = "rgba(60,40,30,0.28)";
    ctx.lineWidth = Math.max(0.8, hr * 0.035);
    const n = 6;
    for (let i = 1; i < n; i++) {
      const tx = mx - w * 0.82 + (i / n) * w * 1.64;
      ctx.beginPath();
      ctx.moveTo(tx, teethTop + hr * 0.01);
      ctx.lineTo(tx, teethBot - hr * 0.01);
      ctx.stroke();
    }

    // Specular shine across enamel
    const shine = ctx.createLinearGradient(mx - w, teethTop, mx + w * 0.4, teethBot);
    shine.addColorStop(0, "rgba(255,255,255,0)");
    shine.addColorStop(0.35, "rgba(255,255,255,0.85)");
    shine.addColorStop(0.55, "rgba(255,255,255,0.15)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.7, teethTop);
    ctx.lineTo(mx - w * 0.15, teethTop);
    ctx.lineTo(mx - w * 0.35, teethBot);
    ctx.lineTo(mx - w * 0.85, teethBot);
    ctx.closePath();
    ctx.fill();

    // Lower lip
    ctx.strokeStyle = shade;
    ctx.lineWidth = Math.max(1.5, hr * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.85, my + hr * (deep ? 0.34 : 0.24));
    ctx.quadraticCurveTo(mx, my + hr * (deep ? 0.48 : 0.34), mx + w * 0.85, my + hr * (deep ? 0.34 : 0.24));
    ctx.stroke();
    return;
  }

  if (expression === "smirk") {
    ctx.strokeStyle = shade;
    ctx.lineWidth = Math.max(1.8, hr * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.7, my);
    ctx.quadraticCurveTo(mx + w * 0.1, my + hr * 0.22, mx + w, my - hr * 0.05);
    ctx.stroke();
    return;
  }

  ctx.strokeStyle = shade;
  ctx.lineWidth = Math.max(1.8, hr * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(mx - w * 0.65, my);
  ctx.lineTo(mx + w * 0.65, my);
  ctx.stroke();
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
) {
  // Socket shade
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.beginPath();
  ctx.ellipse(ex, ey + ry * 0.15, rx * 1.15, ry * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sclera
  ctx.fillStyle = "#fffcf7";
  ctx.beginPath();
  ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(30,18,12,0.22)";
  ctx.lineWidth = Math.max(1, hr * 0.035);
  ctx.stroke();

  const irisR = Math.min(rx, ry) * 0.72;
  const ix = ex + side * rx * 0.08;
  const iy = ey + ry * 0.06;

  // Iris base
  ctx.fillStyle = dna.eye;
  ctx.beginPath();
  ctx.arc(ix, iy, irisR, 0, Math.PI * 2);
  ctx.fill();
  // Iris ring
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = Math.max(1, irisR * 0.18);
  ctx.beginPath();
  ctx.arc(ix, iy, irisR * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  // Darker outer iris
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, irisR * 0.12);
  ctx.beginPath();
  ctx.arc(ix, iy, irisR * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // Pupil
  ctx.fillStyle = "#0a0604";
  ctx.beginPath();
  ctx.arc(ix, iy, irisR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Primary catchlight
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(ix - irisR * 0.28, iy - irisR * 0.32, irisR * 0.28, irisR * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Secondary spark
  ctx.beginPath();
  ctx.arc(ix + irisR * 0.22, iy + irisR * 0.18, irisR * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Upper lid
  ctx.strokeStyle = "rgba(20,12,8,0.45)";
  ctx.lineWidth = Math.max(1.5, hr * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ex - rx * 1.05, ey - ry * 0.15);
  ctx.quadraticCurveTo(ex, ey - ry * 1.15, ex + rx * 1.05, ey - ry * 0.15);
  ctx.stroke();
  // Crease
  ctx.strokeStyle = "rgba(20,12,8,0.18)";
  ctx.lineWidth = Math.max(1, hr * 0.04);
  ctx.beginPath();
  ctx.moveTo(ex - rx * 0.9, ey - ry * 0.55);
  ctx.quadraticCurveTo(ex, ey - ry * 1.35, ex + rx * 0.9, ey - ry * 0.55);
  ctx.stroke();
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  dna: FaceDna,
  hx: number,
  hy: number,
  hr: number,
) {
  const m = faceMetrics(dna);

  // Ears behind head
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

  // Cheek warmth
  ctx.fillStyle = "rgba(220,90,70,0.12)";
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.48, hy + hr * 0.22, hr * 0.22, hr * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * 0.48, hy + hr * 0.22, hr * 0.22, hr * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Forehead highlight
  const hl = ctx.createLinearGradient(hx, hy - hr, hx, hy);
  hl.addColorStop(0, "rgba(255,255,255,0.22)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.35, hr * 0.55, hr * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  drawHair(ctx, dna, hx, hy, hr);

  // Brows
  const browThick = Math.max(2.4, hr * (0.12 + m.browHeavy * 0.08));
  ctx.strokeStyle = dna.brow;
  ctx.lineWidth = browThick;
  ctx.lineCap = "round";
  const browY =
    dna.expression === "focused" || dna.expression === "determined"
      ? hy - hr * 0.34
      : hy - hr * 0.38;
  const browTilt =
    dna.expression === "focused" || dna.expression === "determined" ? 0.14 : 0.05;
  ctx.beginPath();
  ctx.moveTo(hx - hr * (m.eyeSpread + 0.28), browY + hr * browTilt);
  ctx.quadraticCurveTo(
    hx - hr * m.eyeSpread,
    browY - hr * 0.14,
    hx - hr * 0.08,
    browY + hr * 0.02,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + hr * (m.eyeSpread + 0.28), browY + hr * browTilt);
  ctx.quadraticCurveTo(
    hx + hr * m.eyeSpread,
    browY - hr * 0.14,
    hx + hr * 0.08,
    browY + hr * 0.02,
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
    );
  }

  // Nose with bridge + tip highlight
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

  // Facial hair
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

  drawMouth(ctx, dna.expression, hx, hy + hr * 0.5, hr, dna.skinShade, dna);
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
    roundRect(ctx, -size * 0.55, -size * 0.5, size * 1.1, size * 1.05, size * 0.28);
    ctx.fill();
    ctx.fillStyle = shade;
    // Knuckles
    for (let i = -1.5; i <= 1.5; i++) {
      ctx.beginPath();
      ctx.arc(i * size * 0.28, -size * 0.35, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    // Thumb tuck
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(-size * 0.55, size * 0.05, size * 0.28, size * 0.22, -0.5, 0, Math.PI * 2);
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
 * Angle 0 = straight down; positive = forward along (faceX, faceY).
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
): LimbPose[] {
  const hipY = torsoH * 0.38;
  const shoulderY = ty + torsoH * 0.2;
  const fl = Math.hypot(faceX, faceY) || 1;
  let fwdX = faceX / fl;
  let fwdY = faceY / fl;
  // Keep a readable stride even when facing is nearly zero.
  if (Math.hypot(fwdX, fwdY) < 0.2) {
    fwdX = 0;
    fwdY = -1;
  }
  // Perpendicular in screen space for left/right hip & shoulder seats.
  const rightX = -fwdY;
  const rightY = fwdX;

  const poses: LimbPose[] = [];

  for (const side of [-1, 1] as const) {
    const p = phase + (side === 1 ? Math.PI : 0);
    const hipAngle = Math.sin(p) * 0.95 * strideAmt;
    const kneeBend =
      0.18 +
      (0.55 + Math.max(0, Math.cos(p)) * 0.85 + Math.max(0, -Math.sin(p)) * 0.25) *
        strideAmt;
    const shinAngle = hipAngle - kneeBend;

    const seat = torsoW * 0.12 * side;
    const hipX = seat * rightX;
    const hipY0 = hipY + seat * rightY * 0.15;
    const thigh = projectSagittal(
      Math.sin(hipAngle) * thighLen,
      Math.cos(hipAngle) * thighLen,
      fwdX,
      fwdY,
      hipX,
      hipY0,
    );
    const shin = projectSagittal(
      Math.sin(shinAngle) * shinLen,
      Math.cos(shinAngle) * shinLen,
      fwdX,
      fwdY,
      thigh.x,
      thigh.y,
    );

    const ap = p + Math.PI;
    const armSeat = torsoW * 0.46 * side;
    const shoulderX = armSeat * rightX;
    const shoulderY0 = shoulderY + armSeat * rightY * 0.1;
    const armAngle = Math.sin(ap) * 0.75 * strideAmt;
    const elbowBend = 0.35 + Math.max(0, Math.sin(ap)) * 0.45 * strideAmt;
    const elbow = projectSagittal(
      Math.sin(armAngle) * upperArm,
      Math.cos(armAngle) * upperArm,
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
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/**
 * Draw a chibi player: big head, short legs, walk cycle, team jersey.
 * `x,y` is the gameplay center (torso); feet sit below.
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
  } = opts;

  const s = scale;
  const speed = Math.hypot(vx, vy);
  const moving = pose === "run" || speed > 1.4;
  // Slow, loping walk — long strides, not locked to move speed.
  const strideAmt = pose === "shoot" ? 0.08 : moving ? 1 : 0.12;
  const cadence = 1.55;
  const phase = (now / 1000) * cadence * Math.PI * 2 + phaseOffset;
  const bob =
    (moving && pose !== "shoot"
      ? Math.abs(Math.sin(phase * 2)) * 0.22 * strideAmt
      : Math.sin(now / 220) * 0.06) * s;

  // Proportions — oversized JJR head, compact body
  const headR = 2.15 * s;
  const torsoW = 1.85 * s;
  const torsoH = 1.4 * s;
  const thighLen = 0.78 * s;
  const shinLen = 0.72 * s;
  const legSpan = thighLen + shinLen;
  const legW = 0.52 * s;
  const upperArm = 0.62 * s;
  const foreArm = 0.58 * s;
  const armW = 0.4 * s;
  const shoeR = 0.4 * s;
  const handSize = armW * 0.85;

  const cx = x;
  const cy = y + bob;
  const tx = -torsoW / 2;
  const ty = -torsoH * 0.35;

  const fl = Math.hypot(faceX, faceY) || 1;
  const fwdX = faceX / fl;
  const fwdY = faceY / fl;
  const rightX = -fwdY;
  const rightY = fwdX;

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
  );

  // Override arms into a release / follow-through when shooting.
  if (pose === "shoot") {
    for (const limb of limbs) {
      const isShootHand = limb.side === 1;
      if (isShootHand) {
        // Shooting hand high toward the rim
        limb.elbowX = limb.shoulderX + fwdX * upperArm * 0.35 + rightX * 0.15 * s;
        limb.elbowY = limb.shoulderY - upperArm * 0.95;
        limb.handX = limb.elbowX + fwdX * foreArm * 0.55;
        limb.handY = limb.elbowY - foreArm * 0.85;
      } else {
        // Guide hand at cheek / ball line
        limb.elbowX = limb.shoulderX + fwdX * upperArm * 0.4 + rightX * -0.1 * s;
        limb.elbowY = limb.shoulderY - upperArm * 0.35;
        limb.handX = limb.elbowX + fwdX * foreArm * 0.5;
        limb.handY = limb.elbowY - foreArm * 0.15;
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

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + torsoH * 0.55 + legSpan + 2, torsoW * 0.75, 0.45 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (controlled) {
    const pulse = 0.3 + Math.sin(now / 140) * 0.2;
    ctx.strokeStyle = `rgba(255,247,237,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy + torsoH * 0.55 + legSpan + 2,
      torsoW * 0.95,
      0.55 * s,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.translate(cx, cy);

  const drawLeg = (limb: LimbPose) => {
    strokeLimb(ctx, limb.hipX, limb.hipY * 0.25, limb.kneeX, limb.kneeY, legW, shorts);
    strokeLimb(
      ctx,
      limb.kneeX,
      limb.kneeY,
      limb.footX,
      limb.footY - shoeR * 0.2,
      legW * 0.92,
      dna.skin,
    );
    ctx.fillStyle = dna.skinShade;
    ctx.beginPath();
    ctx.arc(limb.kneeX, limb.kneeY, legW * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(
      limb.footX + fwdX * shoeR * 0.45,
      limb.footY + fwdY * shoeR * 0.45,
      shoeR * 1.25,
      shoeR * 0.62,
      Math.atan2(fwdY, fwdX),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  };

  const drawArm = (limb: LimbPose) => {
    ctx.fillStyle = jerseyDark;
    ctx.beginPath();
    ctx.arc(limb.shoulderX, limb.shoulderY, armW * 0.7, 0, Math.PI * 2);
    ctx.fill();
    strokeLimb(
      ctx,
      limb.shoulderX,
      limb.shoulderY,
      limb.elbowX,
      limb.elbowY,
      armW,
      dna.skin,
    );
    strokeLimb(
      ctx,
      limb.elbowX,
      limb.elbowY,
      limb.handX,
      limb.handY,
      armW * 0.9,
      dna.skin,
    );
    ctx.fillStyle = dna.skinShade;
    ctx.beginPath();
    ctx.arc(limb.elbowX, limb.elbowY, armW * 0.35, 0, Math.PI * 2);
    ctx.fill();
    const handAng = Math.atan2(limb.handY - limb.elbowY, limb.handX - limb.elbowX) + Math.PI / 2;
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

  ctx.fillStyle = jersey;
  roundRect(ctx, tx, ty, torsoW, torsoH, torsoW * 0.28);
  ctx.fill();
  ctx.fillStyle = jerseyDark;
  roundRect(ctx, tx + torsoW * 0.12, ty, torsoW * 0.76, torsoH * 0.22, torsoW * 0.12);
  ctx.fill();
  ctx.fillStyle = shorts;
  roundRect(
    ctx,
    tx + torsoW * 0.08,
    ty + torsoH * 0.72,
    torsoW * 0.84,
    torsoH * 0.32,
    torsoW * 0.12,
  );
  ctx.fill();

  drawLeg(front);
  drawArm(front);

  // Oversized detailed head — no ring stroke
  const hx = 0;
  const hy = ty - headR * 0.62;
  drawFace(ctx, dna, hx, hy, headR);

  ctx.restore();

  const labelY = cy + torsoH * 0.55 + legSpan + 6;
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
