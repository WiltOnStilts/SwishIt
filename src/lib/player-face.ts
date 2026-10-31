/** Deterministic cartoon face DNA + SVG for Court Call portraits. */

import { faceLookFor } from "@/lib/player-face-looks";

export type FaceExpression =
  | "smile"
  | "grin"
  | "neutral"
  | "focused"
  | "smirk"
  | "open"
  | "determined"
  | "cool";

export type FaceDna = {
  seed: number;
  skin: string;
  skinShade: string;
  hair: string;
  hairRim: string;
  hairStyle:
    | "bald"
    | "buzz"
    | "short"
    | "fade"
    | "afro"
    | "cornrows"
    | "long"
    | "curl";
  brow: string;
  eye: string;
  facial: "none" | "stubble" | "mustache" | "beard" | "goatee";
  head: "round" | "oval" | "square";
  expression: FaceExpression;
  ear: number;
};

const SKINS = [
  ["#f6d7c3", "#e8b89a"],
  ["#e2b896", "#c9946e"],
  ["#c68642", "#a56b34"],
  ["#8d5524", "#6f4119"],
  ["#5c3830", "#432820"],
  ["#3b241a", "#2a1812"],
] as const;

/** Hair fills that stay readable on the dark court. */
const HAIRS = [
  ["#2a1810", "#d4a574"],
  ["#3d2314", "#e0b888"],
  ["#5a3820", "#f0c89a"],
  ["#1a1a1a", "#c9a06a"],
  ["#4a3020", "#e8c49a"],
  ["#6b4423", "#f5d7a8"],
  ["#24160e", "#d9b07a"],
  ["#3b2f2f", "#cfc0a8"],
] as const;

const STYLES: FaceDna["hairStyle"][] = [
  "bald",
  "buzz",
  "short",
  "fade",
  "afro",
  "cornrows",
  "long",
  "curl",
];

const FACIAL: FaceDna["facial"][] = [
  "none",
  "none",
  "stubble",
  "mustache",
  "beard",
  "goatee",
];

const HEADS: FaceDna["head"][] = ["round", "oval", "square"];

const EXPRESSIONS: FaceExpression[] = [
  "smile",
  "grin",
  "neutral",
  "focused",
  "smirk",
  "open",
  "determined",
  "cool",
];

export function hashName(name: string): number {
  let h = 2166136261;
  const s = name.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length]!;
}

/** NBA-leaning default skin distribution when no curated look exists. */
const DEFAULT_SKIN_ROLL = [2, 3, 3, 4, 4, 4, 5, 5, 1, 2, 3, 4] as const;
const DEFAULT_STYLE_ROLL: FaceDna["hairStyle"][] = [
  "short",
  "fade",
  "buzz",
  "bald",
  "short",
  "cornrows",
  "fade",
  "curl",
  "afro",
  "long",
];

export function faceDnaFromName(playerName: string): FaceDna {
  const seed = hashName(playerName);
  const look = faceLookFor(playerName);

  const skinIdx = look?.skin ?? DEFAULT_SKIN_ROLL[seed % DEFAULT_SKIN_ROLL.length]!;
  const skinPair = SKINS[skinIdx] ?? SKINS[3]!;
  const hairIdx =
    look?.hair != null
      ? look.hair % HAIRS.length
      : skinIdx <= 1
        ? 5 + (seed % 3)
        : (seed >>> 3) % HAIRS.length;
  const hairPair = HAIRS[hairIdx] ?? HAIRS[0]!;

  return {
    seed,
    skin: skinPair[0],
    skinShade: skinPair[1],
    hair: hairPair[0],
    hairRim: hairPair[1],
    hairStyle: look?.hairStyle ?? pick(DEFAULT_STYLE_ROLL, seed >>> 5),
    brow: pick(
      ["#1a120e", "#2c1810", "#3b2314", "#111111", "#4a3020"],
      seed >>> 7,
    ),
    eye: pick(["#1f2937", "#111827", "#3f2a1d", "#0f172a"], seed >>> 9),
    facial: look?.facial ?? pick(FACIAL, seed >>> 11),
    head: look?.head ?? pick(HEADS, seed >>> 13),
    expression: pick(EXPRESSIONS, seed >>> 17),
    ear: 5 + ((seed >>> 15) % 16) / 10,
  };
}

export function faceSlug(playerName: string): string {
  const base = playerName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const h = hashName(playerName).toString(16).padStart(8, "0");
  return `${base || "player"}-${h}`;
}

export function facePublicPath(playerName: string): string {
  return `/player-faces/${faceSlug(playerName)}.svg`;
}

export function lastNameOf(playerName: string): string {
  const parts = playerName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const suffixes = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
  let end = parts.length - 1;
  while (end > 0 && suffixes.has(parts[end]!.toLowerCase().replace(/\./g, ""))) {
    end -= 1;
  }
  const last = parts[end] ?? parts[parts.length - 1]!;
  return last.replace(/[^a-zA-Z'-]/g, "").slice(0, 12).toUpperCase() || "?";
}

function headPath(head: FaceDna["head"]): string {
  if (head === "oval") {
    return "M32 10 C48 10 54 24 54 34 C54 50 44 58 32 58 C20 58 10 50 10 34 C10 24 16 10 32 10 Z";
  }
  if (head === "square") {
    return "M13 16 C13 12 17 10 23 10 H41 C47 10 51 12 51 16 V48 C51 56 43 58 32 58 C21 58 13 56 13 48 Z";
  }
  return "M32 9 C50 9 55 23 55 34 C55 52 44 59 32 59 C20 59 9 52 9 34 C9 23 14 9 32 9 Z";
}

function hairSvg(dna: FaceDna): string {
  const c = dna.hair;
  const rim = dna.hairRim;
  const stroke = `stroke="${rim}" stroke-width="1.6"`;
  switch (dna.hairStyle) {
    case "bald":
      return "";
    case "buzz":
      return `<ellipse cx="32" cy="18" rx="20" ry="12" fill="${c}" ${stroke} opacity="0.95"/>`;
    case "short":
      return `<path d="M12 28 C12 12 20 6 32 6 C44 6 52 12 52 28 L48 24 C44 14 38 12 32 12 C26 12 20 14 16 24 Z" fill="${c}" ${stroke}/>`;
    case "fade":
      return `<path d="M13 30 C13 14 21 7 32 7 C43 7 51 14 51 30 L47 22 C43 13 37 11 32 11 C27 11 21 13 17 22 Z" fill="${c}" ${stroke}/><path d="M11 34 C13 24 17 20 21 20 L19 36 Z" fill="${c}" opacity="0.7"/><path d="M53 34 C51 24 47 20 43 20 L45 36 Z" fill="${c}" opacity="0.7"/>`;
    case "afro":
      return `<circle cx="32" cy="18" r="22" fill="${c}" ${stroke}/><circle cx="14" cy="22" r="9" fill="${c}" ${stroke}/><circle cx="50" cy="22" r="9" fill="${c}" ${stroke}/>`;
    case "cornrows":
      return `<path d="M16 14 C20 6 28 4 32 4 C36 4 44 6 48 14" stroke="${rim}" stroke-width="3.2" fill="none"/><path d="M18 16 L18 34" stroke="${c}" stroke-width="2.8"/><path d="M24 14 L24 36" stroke="${c}" stroke-width="2.8"/><path d="M32 12 L32 38" stroke="${c}" stroke-width="2.8"/><path d="M40 14 L40 36" stroke="${c}" stroke-width="2.8"/><path d="M46 16 L46 34" stroke="${c}" stroke-width="2.8"/><path d="M18 16 L18 34" stroke="${rim}" stroke-width="1"/><path d="M32 12 L32 38" stroke="${rim}" stroke-width="1"/>`;
    case "long":
      return `<path d="M10 28 C10 12 20 5 32 5 C44 5 54 12 54 28 L54 50 C50 44 46 42 42 44 L42 28 C42 16 37 12 32 12 C27 12 22 16 22 28 L22 44 C18 42 14 44 10 50 Z" fill="${c}" ${stroke}/>`;
    case "curl":
      return `<circle cx="18" cy="16" r="8" fill="${c}" ${stroke}/><circle cx="28" cy="10" r="8" fill="${c}" ${stroke}/><circle cx="38" cy="10" r="8" fill="${c}" ${stroke}/><circle cx="46" cy="16" r="8" fill="${c}" ${stroke}/><circle cx="32" cy="18" r="10" fill="${c}" ${stroke}/>`;
  }
}

function facialSvg(dna: FaceDna): string {
  const c = dna.hair;
  if (dna.facial === "none") return "";
  if (dna.facial === "stubble") {
    return `<ellipse cx="32" cy="46" rx="13" ry="9" fill="${c}" opacity="0.28"/>`;
  }
  if (dna.facial === "mustache") {
    return `<path d="M23 42 Q32 48 41 42 Q35 46 32 46 Q29 46 23 42 Z" fill="${c}"/>`;
  }
  if (dna.facial === "goatee") {
    return `<path d="M28 44 Q32 56 36 44 Q32 48 28 44 Z" fill="${c}"/><path d="M24 42 Q32 46 40 42 Q34 45 32 45 Q30 45 24 42 Z" fill="${c}"/>`;
  }
  return `<path d="M18 40 Q32 58 46 40 L42 42 Q32 54 22 42 Z" fill="${c}"/><path d="M22 40 Q32 46 42 40 Q36 44 32 44 Q28 44 22 40 Z" fill="${c}"/>`;
}

function mouthSvg(expression: FaceExpression, shade: string): string {
  switch (expression) {
    case "smile":
      return `<path d="M25 46 Q32 51 39 46" stroke="${shade}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case "grin":
      return `<path d="M24 45 Q32 53 40 45" fill="#3b1f14"/><path d="M26 46 Q32 51 38 46" fill="#f5f0e8"/>`;
    case "neutral":
      return `<path d="M26 47 L38 47" stroke="${shade}" stroke-width="2.1" stroke-linecap="round"/>`;
    case "focused":
      return `<path d="M27 48 L37 47" stroke="${shade}" stroke-width="2.2" stroke-linecap="round"/>`;
    case "smirk":
      return `<path d="M26 47 Q34 51 40 45" stroke="${shade}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case "open":
      return `<ellipse cx="32" cy="48" rx="4.2" ry="3.2" fill="#3b1f14"/><ellipse cx="32" cy="47.2" rx="3" ry="1.2" fill="#c45c4a" opacity="0.7"/>`;
    case "determined":
      return `<path d="M25 48 L39 48" stroke="${shade}" stroke-width="2.4" stroke-linecap="round"/><path d="M25 46 L28 48" stroke="${shade}" stroke-width="1.4" stroke-linecap="round"/>`;
    case "cool":
      return `<path d="M25 46 Q32 49 39 46" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
}

function browSvg(expression: FaceExpression, brow: string): string {
  if (expression === "focused" || expression === "determined") {
    return `<path d="M19 29 Q24 25 29 29" stroke="${brow}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M35 29 Q40 25 45 29" stroke="${brow}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  if (expression === "cool") {
    return `<path d="M19 27 Q24 29 29 27" stroke="${brow}" stroke-width="2.3" fill="none" stroke-linecap="round"/><path d="M35 27 Q40 29 45 27" stroke="${brow}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
  }
  if (expression === "grin" || expression === "open") {
    return `<path d="M19 27 Q24 24 29 28" stroke="${brow}" stroke-width="2.3" fill="none" stroke-linecap="round"/><path d="M35 28 Q40 24 45 27" stroke="${brow}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
  }
  return `<path d="M19 28 Q24 25 29 28" stroke="${brow}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M35 28 Q40 25 45 28" stroke="${brow}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
}

/**
 * Portrait SVG with centered features, varied expressions, and hair rim light
 * so dark hair stays visible on the court.
 */
export function renderFaceSvg(dna: FaceDna, playerName: string): string {
  const ear = dna.ear;
  const title = playerName.replace(/[<>&"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" role="img" aria-label="${title}">
  <defs>
    <clipPath id="c"><circle cx="32" cy="32" r="30"/></clipPath>
  </defs>
  <circle cx="32" cy="32" r="31" fill="#1a100c"/>
  <g clip-path="url(#c)">
    <circle cx="32" cy="32" r="30" fill="#c9a57a"/>
    <ellipse cx="${32 - 20}" cy="34" rx="${ear}" ry="${ear + 2}" fill="${dna.skinShade}"/>
    <ellipse cx="${32 + 20}" cy="34" rx="${ear}" ry="${ear + 2}" fill="${dna.skinShade}"/>
    <path d="${headPath(dna.head)}" fill="${dna.skin}"/>
    ${hairSvg(dna)}
    ${browSvg(dna.expression, dna.brow)}
    <ellipse cx="24" cy="33" rx="3.6" ry="4" fill="#fff"/>
    <ellipse cx="40" cy="33" rx="3.6" ry="4" fill="#fff"/>
    <circle cx="24.5" cy="33.4" r="1.9" fill="${dna.eye}"/>
    <circle cx="40.5" cy="33.4" r="1.9" fill="${dna.eye}"/>
    <circle cx="25.2" cy="32.6" r="0.55" fill="#fff" opacity="0.85"/>
    <circle cx="41.2" cy="32.6" r="0.55" fill="#fff" opacity="0.85"/>
    <path d="M32 35 L29.5 41 L34.5 41 Z" fill="${dna.skinShade}"/>
    ${facialSvg(dna)}
    ${mouthSvg(dna.expression, dna.skinShade)}
  </g>
  <circle cx="32" cy="32" r="30" fill="none" stroke="#f97316" stroke-width="2.5" opacity="0.9"/>
</svg>
`;
}

export function buildPlayerFace(playerName: string): {
  dna: FaceDna;
  slug: string;
  imagePath: string;
  svg: string;
  faceJson: string;
} {
  const dna = faceDnaFromName(playerName);
  const slug = faceSlug(playerName);
  return {
    dna,
    slug,
    imagePath: `/player-faces/${slug}.svg`,
    svg: renderFaceSvg(dna, playerName),
    faceJson: JSON.stringify(dna),
  };
}
