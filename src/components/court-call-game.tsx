"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CourtPos } from "@/lib/season";
import {
  COURT_CALL_STEPS,
  COURT_DIFFICULTY_LABELS,
  defenseRating,
  difficultyTuning,
  meterGrade,
  meterZones,
  offenseRating,
  passRating,
  type CourtDifficulty,
  type CourtSquad,
} from "@/lib/court-call";
import { faceDnaFromName, lastNameOf, type FaceDna } from "@/lib/player-face";
import {
  fillProjectedPoly,
  projectCourt,
  projectGroundPoly,
  strokeProjectedLine,
  strokeProjectedPoly,
  type Camera3D,
} from "@/lib/court-call-3d";
import {
  drawCourtCallSprite,
  lerpFaceLive,
  restingFaceLive,
  type FaceLive,
  type SpritePose,
} from "@/lib/court-call-sprite";

type Side = "you" | "opp";

type Actor = {
  id: string;
  side: Side;
  slot: CourtPos;
  name: string;
  lastName: string;
  dna: FaceDna;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Last facing for dribble — ball sits in front this way. */
  faceX: number;
  faceY: number;
  offense: number;
  defense: number;
  pass: number;
  /** Smooth live face morph — eased toward action targets each frame. */
  faceLive: FaceLive;
};

/** Must be this close (centers) to steal from a handler. */
const STEAL_REACH = 2.45;
/** Must be this close to the loose ball to board on button press. */
const REBOUND_REACH = 2.35;
/** Contested block while the shot is up. */
const BLOCK_REACH = 2.55;
/** Sim-time for every shot to reach the rim — same length near or deep. */
const SHOT_FLIGHT_SEC = 0.72;
const SHOT_HIT_RADIUS = 2.15;

type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string | null;
  inAir: boolean;
  /** Missed shot / tip — free ball until someone grabs it. */
  loose: boolean;
  shooterId: string | null;
  targetBasket: "you" | "opp" | null;
  timing: number | null;
  /** Nearest defender distance at the moment of release (for fair make %). */
  releaseContest: number | null;
  /** Distance to the rim at release. */
  releaseDistance: number | null;
};

type MeterState = {
  /** Needle is moving — player is timing the release. */
  active: boolean;
  t: number;
  /** +1 toward 1, -1 toward 0 — lets speed change mid-swing without jumping. */
  dir: 1 | -1;
  startedAt: number;
  /** Keep the frozen meter on screen until this timestamp. */
  holdUntil: number;
};

type FxParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
};

type InboundState = {
  fromId: string;
  toId: string;
  receiving: Side;
  /** Baseline of the hoop that was scored on. */
  baselineY: number;
  /** Rough spot the receiver should run to. */
  floorY: number;
  /** Set once the inbounder reaches the baseline. */
  releaseAt: number | null;
  catchAt: number | null;
};

type GameState = {
  actors: Actor[];
  ball: BallState;
  youScore: number;
  oppScore: number;
  controlId: string;
  message: string;
  messageUntil: number;
  over: boolean;
  winner: Side | null;
  meter: MeterState;
  camX: number;
  camY: number;
  fx: FxParticle[];
  scorePulseUntil: number;
  lastScorer: Side | null;
  /** Seconds the human has held the ball while barely moving. */
  campTimer: number;
  /** After a make — other team passes it in from the baseline. */
  inbound: InboundState | null;
  /** Real-time deadline for post-shot slow motion. */
  slowMoUntil: number;
  /** 1–4 regular, 5 = OT. */
  quarter: number;
  /** Seconds left in the current quarter. */
  quarterClock: number;
  /** Seconds left on the shot clock. */
  shotClock: number;
  /** Brief pause between quarters. */
  quarterBreakUntil: number;
};

const W = 50;
const H = 94;
/** Legacy pan clamps (court units) for the 3D sideline camera. */
const VIEW_W = 50;
const VIEW_H = 56;
const PLAYER_R = 2.55;
const PLAYER_GAP = 0.85;
const BALL_R = 0.72;
const QUARTER_SEC = 60;
const SHOT_CLOCK_SEC = 24;
const REG_QUARTERS = 4;
const SLOTS: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];
const MIN_SEPARATION = PLAYER_R * 2 + PLAYER_GAP;

function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds - 1e-6));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function resetShotClock(state: GameState) {
  state.shotClock = SHOT_CLOCK_SEC;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function formatOffsets(
  slots: CourtPos[],
  side: Side,
): Partial<Record<CourtPos, [number, number]>> {
  const n = slots.length;
  const baseY = side === "you" ? 68 : 26;
  const depthStep = side === "you" ? 5.5 : -5.5;
  const out: Partial<Record<CourtPos, [number, number]>> = {};
  if (n === 1) {
    out[slots[0]!] = [25, baseY];
    return out;
  }
  if (n === 2) {
    out[slots[0]!] = [18, baseY];
    out[slots[1]!] = [32, baseY + depthStep * 0.35];
    return out;
  }
  if (n === 3) {
    out[slots[0]!] = [25, baseY];
    out[slots[1]!] = [12, baseY + depthStep * 0.55];
    out[slots[2]!] = [38, baseY + depthStep * 0.55];
    return out;
  }
  if (n === 4) {
    out[slots[0]!] = [20, baseY];
    out[slots[1]!] = [30, baseY];
    out[slots[2]!] = [12, baseY + depthStep];
    out[slots[3]!] = [38, baseY + depthStep];
    return out;
  }
  // 5v5
  out.PG = [25, baseY];
  out.SG = [11, baseY + depthStep * 0.45];
  out.SF = [39, baseY + depthStep * 0.45];
  out.PF = [16, baseY + depthStep * 1.35];
  out.C = [34, baseY + depthStep * 1.45];
  return out;
}

function makeActors(you: CourtSquad, opp: CourtSquad): Actor[] {
  const slots = you.slots.length ? you.slots : SLOTS;
  const youOffsets = formatOffsets(slots, "you");
  const oppOffsets = formatOffsets(slots, "opp");

  const out: Actor[] = [];
  for (const slot of slots) {
    const yp = you.lineup[slot];
    const op = opp.lineup[slot];
    if (!yp || !op) continue;
    const [yx, yy] = youOffsets[slot] ?? [25, 66];
    const [ox, oy] = oppOffsets[slot] ?? [25, 28];
    const youDna = faceDnaFromName(yp.playerName);
    const oppDna = faceDnaFromName(op.playerName);
    out.push({
      id: `you-${slot}`,
      side: "you",
      slot,
      name: yp.playerName,
      lastName: lastNameOf(yp.playerName),
      dna: youDna,
      x: yx,
      y: yy,
      vx: 0,
      vy: 0,
      faceX: 0,
      faceY: -1,
      offense: offenseRating(yp),
      defense: defenseRating(yp),
      pass: passRating(yp),
      faceLive: { ...restingFaceLive(youDna.expression) },
    });
    out.push({
      id: `opp-${slot}`,
      side: "opp",
      slot,
      name: op.playerName,
      lastName: lastNameOf(op.playerName),
      dna: oppDna,
      x: ox,
      y: oy,
      vx: 0,
      vy: 0,
      faceX: 0,
      faceY: 1,
      offense: offenseRating(op),
      defense: defenseRating(op),
      pass: passRating(op),
      faceLive: { ...restingFaceLive(oppDna.expression) },
    });
  }
  return out;
}

/** Pick a face target from live play, then ease toward it (no hard snaps). */
function updateActorFaceLive(state: GameState, a: Actor, dt: number, now: number) {
  const rest = restingFaceLive(a.dna.expression);
  const target: FaceLive = { ...rest };
  const speed = Math.hypot(a.vx, a.vy);
  const attackY = a.side === "you" ? 4 : H - 4;
  const rimDist = dist(a.x, a.y, 25, attackY);
  // Positive when sprinting toward the hoop they attack.
  const towardRim = a.side === "you" ? -a.vy : a.vy;
  const cutting = speed > 5.5 && towardRim > 2.8 && rimDist < 42;
  const hasBall = state.ball.ownerId === a.id && !state.ball.loose && !state.ball.inAir;
  const shooting =
    (state.meter.active && state.ball.ownerId === a.id) ||
    (state.ball.inAir && state.ball.shooterId === a.id) ||
    (now < state.meter.holdUntil && state.ball.shooterId === a.id);
  const crashing =
    state.ball.loose ||
    (state.ball.inAir && dist(a.x, a.y, state.ball.x, state.ball.y) < 8);
  const onDefense =
    Boolean(state.ball.ownerId) &&
    !state.ball.ownerId!.startsWith(a.side) &&
    !state.ball.loose;
  const guardingClose =
    onDefense &&
    state.ball.ownerId != null &&
    dist(
      a.x,
      a.y,
      state.actors.find((o) => o.id === state.ball.ownerId)?.x ?? a.x,
      state.actors.find((o) => o.id === state.ball.ownerId)?.y ?? a.y,
    ) < 5;

  if (shooting) {
    target.open = 0.08;
    target.smile = 0.05;
    target.brow = -0.85;
    target.intense = 1;
  } else if (cutting) {
    // Effort yell — open enough to read, not a cartoon gape.
    target.open = 0.55;
    target.smile = 0.18;
    target.brow = 0.55;
    target.intense = 0.4;
  } else if (crashing) {
    target.open = 0.42;
    target.smile = 0.12;
    target.brow = 0.35;
    target.intense = 0.55;
  } else if (hasBall && speed > 4) {
    target.open = 0.18;
    target.smile = 0.1;
    target.brow = -0.45;
    target.intense = 0.75;
  } else if (hasBall) {
    target.open = 0.08;
    target.smile = 0.18;
    target.brow = -0.25;
    target.intense = 0.45;
  } else if (guardingClose) {
    target.open = 0.04;
    target.smile = 0.04;
    target.brow = -0.7;
    target.intense = 0.9;
  } else if (speed > 3.5) {
    target.open = 0.22;
    target.smile = 0.14;
    target.brow = 0.15;
    target.intense = 0.28;
  }
  // Slightly faster open/close so cuts read immediately; brows ease a touch slower.
  lerpFaceLive(a.faceLive, target, dt, shooting || cutting ? 11 : 7.5);
}

/** Keep facing from movement so the dribble stays out front. */
function updateFacing(a: Actor) {
  const mag = Math.hypot(a.vx, a.vy);
  if (mag > 1.2) {
    a.faceX = a.vx / mag;
    a.faceY = a.vy / mag;
  }
}

/** Ball sits in front of the handler along their facing (not in the chest). */
function placeDribbleBall(state: GameState, owner: Actor, now: number) {
  updateFacing(owner);
  const bob = Math.abs(Math.sin(now / 110));
  // Chibi torso is shorter than the old face-circle radius — keep the ball out front.
  const forward = 2.35 + bob * 0.45;
  // Push slightly toward the dominant horizontal side when cutting diagonally
  // so up-left / up-right reads clearly as top-left / top-right of the body.
  const sidePush = owner.faceX * 0.35;
  state.ball.x = clamp(owner.x + owner.faceX * forward + sidePush * 0.25, 1.5, W - 1.5);
  state.ball.y = clamp(owner.y + owner.faceY * forward, 1.5, H - 1.5);
}

/**
 * Start a baseline inbound for `receiving`.
 * `atTop` = inbound from the top baseline (opp hoop end).
 */
function startInbound(
  state: GameState,
  receiving: Side,
  atTop: boolean,
  now: number,
  message: string,
  opts?: { slowMoMs?: number; scorePulse?: boolean; lastScorer?: Side | null },
) {
  const baselineY = atTop ? 3.2 : H - 3.2;
  const floorY = atTop ? 16 : H - 16;

  for (const a of state.actors) {
    a.vx *= 0.35;
    a.vy *= 0.35;
  }

  const inbounder = state.actors
    .filter((a) => a.side === receiving)
    .sort(
      (a, b) =>
        dist(a.x, a.y, 25, baselineY) - dist(b.x, b.y, 25, baselineY),
    )[0]!;
  const receiver =
    receiving === "you"
      ? (state.actors.find((a) => a.id === state.controlId) ??
        state.actors.find((a) => a.side === "you")!)
      : (state.actors.find((a) => a.side === "opp" && a.slot === "PG") ??
        state.actors.find((a) => a.side === "opp")!);

  let to = receiver;
  if (to.id === inbounder.id) {
    to =
      state.actors.find(
        (a) => a.side === receiving && a.id !== inbounder.id && a.slot === "PG",
      ) ??
      state.actors.find((a) => a.side === receiving && a.id !== inbounder.id)!;
  }

  state.ball = {
    x: inbounder.x,
    y: inbounder.y,
    vx: 0,
    vy: 0,
    ownerId: inbounder.id,
    inAir: false,
    loose: false,
    shooterId: null,
    targetBasket: null,
    timing: null,
    releaseContest: null,
    releaseDistance: null,
  };
  state.meter = { active: false, t: 0, dir: 1, startedAt: 0, holdUntil: 0 };
  state.campTimer = 0;
  resetShotClock(state);
  if (opts?.slowMoMs) beginSlowMo(state, now, opts.slowMoMs);
  state.inbound = {
    fromId: inbounder.id,
    toId: to.id,
    receiving,
    baselineY,
    floorY,
    releaseAt: null,
    catchAt: null,
  };
  state.message = message;
  state.messageUntil = now + 2000;
  if (opts?.scorePulse) state.scorePulseUntil = now + 900;
  if (opts?.lastScorer !== undefined) state.lastScorer = opts.lastScorer;
}

function resetAfterScore(state: GameState, scorer: Side) {
  const receiving: Side = scorer === "you" ? "opp" : "you";
  const now = performance.now();
  // Inbound from the baseline of the hoop that was just scored on.
  startInbound(
    state,
    receiving,
    scorer === "you",
    now,
    scorer === "you" ? "Swish!" : "THEY SCORE! · Your ball",
    { slowMoMs: 850, scorePulse: true, lastScorer: scorer },
  );
  const hoopY = scorer === "you" ? 4 : H - 4;
  burstFx(state, 25, hoopY, scorer === "you" ? "#fb923c" : "#60a5fa", 18);
  burstText(
    state,
    25,
    hoopY + (scorer === "you" ? 6 : -6),
    "+2",
    scorer === "you" ? "#fb923c" : "#93c5fd",
  );
}

/** Shot-clock violation — other team inbounds from the offensive baseline. */
function shotClockViolation(state: GameState, violator: Side, now: number) {
  const receiving: Side = violator === "you" ? "opp" : "you";
  // Violator was attacking this end — inbound there for the defense.
  startInbound(
    state,
    receiving,
    violator === "you",
    now,
    "Shot clock violation!",
    { slowMoMs: 500 },
  );
  const hoopY = violator === "you" ? 4 : H - 4;
  burstFx(state, 25, hoopY, "#9ca3af", 12);
  burstText(state, 25, hoopY + (violator === "you" ? 8 : -8), "VIOLATION", "#f87171");
}

/** Spots players run toward during the post-score inbound (no teleports). */
function inboundRunTarget(
  a: Actor,
  ib: InboundState,
): { x: number; y: number } {
  const lane = slotLaneX(a.slot);
  if (a.id === ib.fromId) {
    return { x: clamp(25 + (lane - 25) * 0.15, 12, W - 12), y: ib.baselineY };
  }
  if (a.id === ib.toId) {
    return {
      x: clamp(lane * 0.55 + 25 * 0.45, 10, W - 10),
      y: ib.floorY,
    };
  }
  if (a.side === ib.receiving) {
    return {
      x: clamp(lane, 8, W - 8),
      y: clamp(
        ib.floorY + (a.slot === "C" || a.slot === "PF" ? (ib.baselineY < H / 2 ? 4 : -4) : 2),
        6,
        H - 6,
      ),
    };
  }
  // Scoring team retreats toward their own half.
  const retreatY = a.side === "you" ? 62 : 32;
  return { x: clamp(lane, 8, W - 8), y: retreatY };
}

function burstFx(
  state: GameState,
  x: number,
  y: number,
  color: string,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 8 + Math.random() * 14;
    state.fx.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0.45 + Math.random() * 0.35,
      maxLife: 0.8,
      color,
      size: 0.35 + Math.random() * 0.45,
    });
  }
}

function burstText(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  state.fx.push({
    x,
    y,
    vx: 0,
    vy: -6,
    life: 1.1,
    maxLife: 1.1,
    color,
    size: 1.2,
    text,
  });
}

function createState(
  you: CourtSquad,
  opp: CourtSquad,
  lockSlot: CourtPos,
): GameState {
  const actors = makeActors(you, opp);
  const locked =
    actors.find((a) => a.side === "you" && a.slot === lockSlot) ??
    actors.find((a) => a.side === "you" && a.slot === "PG")!;
  return {
    actors,
    ball: {
      x: locked.x,
      y: locked.y,
      vx: 0,
      vy: 0,
      ownerId: locked.id,
      inAir: false,
      loose: false,
      shooterId: null,
      targetBasket: null,
      timing: null,
      releaseContest: null,
      releaseDistance: null,
    },
    youScore: 0,
    oppScore: 0,
    controlId: locked.id,
    message: "Let's ball!",
    messageUntil: performance.now() + 1600,
    over: false,
    winner: null,
    meter: { active: false, t: 0, dir: 1, startedAt: 0, holdUntil: 0 },
    camX: locked.x,
    camY: locked.y,
    fx: [],
    scorePulseUntil: 0,
    lastScorer: null,
    campTimer: 0,
    inbound: null,
    slowMoUntil: 0,
    quarter: 1,
    quarterClock: QUARTER_SEC,
    shotClock: SHOT_CLOCK_SEC,
    quarterBreakUntil: 0,
  };
}

function beginSlowMo(state: GameState, now: number, ms: number) {
  state.slowMoUntil = Math.max(state.slowMoUntil, now + ms);
}

function endGame(state: GameState, now: number) {
  state.over = true;
  state.meter.active = false;
  if (state.youScore === state.oppScore) {
    state.winner = null;
    state.message = "Tie game!";
  } else {
    state.winner = state.youScore > state.oppScore ? "you" : "opp";
    state.message = state.winner === "you" ? "You win!" : "They win!";
  }
  state.messageUntil = now + 999999;
}

function possessionSide(state: GameState): Side | null {
  if (state.ball.ownerId?.startsWith("you")) return "you";
  if (state.ball.ownerId?.startsWith("opp")) return "opp";
  if (state.inbound) {
    const from = state.actors.find((a) => a.id === state.inbound!.fromId);
    return from?.side ?? null;
  }
  return null;
}

function tickClocks(state: GameState, clockDt: number, now: number) {
  if (state.over) return;
  if (now < state.quarterBreakUntil) return;

  state.quarterClock = Math.max(0, state.quarterClock - clockDt);

  // Shot clock only while a team has the ball or is inbound (freeze on loose / flight).
  const shotTicking = Boolean(state.ball.ownerId) || Boolean(state.inbound);
  if (shotTicking) {
    state.shotClock = Math.max(0, state.shotClock - clockDt);
  }

  if (state.shotClock <= 0 && shotTicking) {
    const side = possessionSide(state);
    if (side) {
      shotClockViolation(state, side, now);
    }
  }

  if (state.quarterClock <= 0) {
    if (state.quarter < REG_QUARTERS) {
      state.quarter += 1;
      state.quarterClock = QUARTER_SEC;
      state.quarterBreakUntil = now + 1800;
      resetShotClock(state);
      state.meter.active = false;
      state.message = `End of Q${state.quarter - 1} · Q${state.quarter}`;
      state.messageUntil = now + 1800;
    } else if (state.quarter === REG_QUARTERS) {
      if (state.youScore === state.oppScore) {
        state.quarter = 5;
        state.quarterClock = QUARTER_SEC;
        state.quarterBreakUntil = now + 1800;
        resetShotClock(state);
        state.message = "Overtime!";
        state.messageUntil = now + 1800;
      } else {
        endGame(state, now);
      }
    } else {
      endGame(state, now);
    }
  }
}

export function CourtCallGame({
  you,
  opp,
  lockSlot,
  onExit,
}: {
  you: CourtSquad;
  opp: CourtSquad;
  lockSlot: CourtPos;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const moveRef = useRef({ x: 0, y: 0 });
  const stickRef = useRef({ active: false, nx: 0, ny: 0 });
  const keysRef = useRef(new Set<string>());
  const actionQueue = useRef<
    Array<"shoot" | "pass" | "steal" | "block" | "rebound">
  >([]);
  const difficultyRef = useRef<CourtDifficulty>("normal");
  const [difficulty, setDifficulty] = useState<CourtDifficulty>("normal");
  const [hud, setHud] = useState({
    you: 0,
    opp: 0,
    msg: "",
    over: false,
    meter: null as null | { t: number; green: number; frozen: boolean },
    slowMo: false,
    quarter: 1,
    quarterClock: QUARTER_SEC,
    shotClock: SHOT_CLOCK_SEC,
  });
  const [isTouch, setIsTouch] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const introRef = useRef(true);
  const infoTitleId = useId();

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    const touchMq = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsTouch(touchMq.matches);
    sync();
    touchMq.addEventListener("change", sync);
    return () => touchMq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setIntro(true);
    introRef.current = true;
    const state = createState(you, opp, lockSlot);
    stateRef.current = state;
    setHud({
      you: 0,
      opp: 0,
      msg: "",
      over: false,
      meter: null,
      slowMo: false,
      quarter: 1,
      quarterClock: QUARTER_SEC,
      shotClock: SHOT_CLOCK_SEC,
    });
  }, [you, opp, lockSlot]);

  function beginTipOff() {
    introRef.current = false;
    setIntro(false);
    const state = stateRef.current;
    if (!state) return;
    state.message = "TIP OFF!";
    state.messageUntil = performance.now() + 1200;
    burstFx(state, state.ball.x, state.ball.y, "#fb923c", 24);
    burstText(state, 25, state.ball.y - 4, "TIP OFF", "#fff7ed");
  }

  function queueAction(a: "shoot" | "pass" | "steal" | "block" | "rebound") {
    actionQueue.current.push(a);
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(
          k,
        ) ||
        e.code === "Space"
      ) {
        e.preventDefault();
      }
      keysRef.current.add(k);
      if (e.code === "Space") keysRef.current.add(" ");
      if (k === " " || e.code === "Space") queueAction("shoot");
      if (k === "k" || k === "e") queueAction("pass");
      if (k === "g") queueAction("steal");
      if (k === "f") queueAction("block");
      if (k === "h") queueAction("rebound");
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
      if (e.code === "Space") keysRef.current.delete(" ");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!infoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const rawDt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!state || !canvas) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const slowMo = now < state.slowMoUntil;
      // Mild slow-mo — enough to read the result, not a crawl.
      const dt = rawDt * (slowMo ? 0.58 : 1);

      // Screen-space stick: +x = right on screen, +y = down on screen.
      let sx = 0;
      let sy = 0;
      const keys = keysRef.current;
      if (keys.has("arrowleft") || keys.has("a")) sx -= 1;
      if (keys.has("arrowright") || keys.has("d")) sx += 1;
      if (keys.has("arrowup") || keys.has("w")) sy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) sy += 1;
      if (stickRef.current.active) {
        sx = stickRef.current.nx;
        sy = stickRef.current.ny;
      }
      const mag = Math.hypot(sx, sy);
      if (mag > 1) {
        sx /= mag;
        sy /= mag;
      }
      // Sideline 3D camera: right on screen ≈ toward your hoop (−alongY),
      // up on screen ≈ toward the far sideline (+laneX).
      moveRef.current = { x: -sy, y: -sx };

      const tuning = difficultyTuning(difficultyRef.current);
      if (!introRef.current && !state.over) {
        tickClocks(state, rawDt, now);
        if (now >= state.quarterBreakUntil) {
          stepGame(state, dt, now, moveRef.current, actionQueue.current, tuning);
        }
        actionQueue.current = [];
      } else {
        actionQueue.current = [];
      }

      if (introRef.current) {
        // Keep the court alive during tip-off: idle sway + sparkles.
        for (const a of state.actors) {
          a.x += Math.sin(now / 420 + a.x) * 0.004;
          a.y += Math.cos(now / 500 + a.y) * 0.004;
        }
        separateActors(state.actors);
        if (Math.random() < rawDt * 2.5) {
          burstFx(
            state,
            8 + Math.random() * 34,
            10 + Math.random() * 70,
            Math.random() > 0.5 ? "#fb923c" : "#60a5fa",
            3,
          );
        }
        // Frame the whole matchup during intro.
        state.camX += (25 - state.camX) * Math.min(1, 4 * rawDt);
        state.camY += (H / 2 - state.camY) * Math.min(1, 4 * rawDt);
      } else if (!state.meter.active) {
        updateCamera(state, dt);
      }
      if (!state.meter.active) stepFx(state, dt);
      drawCourt(canvas, state, now, you, opp, introRef.current);
      setHud((prev) => {
        const meterVisible =
          state.meter.active || now < state.meter.holdUntil;
        const next = {
          you: state.youScore,
          opp: state.oppScore,
          msg: now < state.messageUntil ? state.message : state.over ? state.message : "",
          over: state.over,
          meter: meterVisible
            ? {
                t: state.meter.t,
                green: tuning.greenWidth,
                frozen: !state.meter.active && now < state.meter.holdUntil,
              }
            : null,
          slowMo,
          quarter: state.quarter,
          quarterClock: state.quarterClock,
          shotClock: state.shotClock,
        };
        if (
          prev.you === next.you &&
          prev.opp === next.opp &&
          prev.msg === next.msg &&
          prev.over === next.over &&
          prev.meter?.t === next.meter?.t &&
          prev.meter?.green === next.meter?.green &&
          prev.meter?.frozen === next.meter?.frozen &&
          Boolean(prev.meter) === Boolean(next.meter) &&
          prev.slowMo === next.slowMo &&
          prev.quarter === next.quarter &&
          prev.quarterClock === next.quarterClock &&
          prev.shotClock === next.shotClock
        ) {
          return prev;
        }
        return next;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[var(--bg,#0c0a09)]">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.35rem,env(safe-area-inset-top))] pb-0.5">
        <button
          type="button"
          onClick={onExit}
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
        >
          ← Exit
        </button>
        <div className="flex min-w-0 flex-col items-center leading-none">
          <div className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--ink)] sm:text-xl">
            <span className="text-[var(--orange-hot)]">{hud.you}</span>
            <span className="mx-1.5 text-[var(--muted)]">–</span>
            <span>{hud.opp}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            <span className="text-[var(--orange-hot)]">
              {you.year} {you.team.abbreviation}
            </span>
            <span className="text-sky-300">
              {opp.year} {opp.team.abbreviation}
            </span>
            {!intro ? (
              <span
                className={`rounded-full border px-1.5 py-0.5 tabular-nums tracking-[0.12em] ${
                  hud.shotClock <= 6
                    ? "border-red-400/50 text-red-300"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {Math.ceil(Math.max(0, hud.shotClock))}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex min-w-12 flex-col items-end leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            {hud.quarter > REG_QUARTERS ? "OT" : `Q${hud.quarter}`}
          </span>
          <span className="font-[family-name:var(--font-display)] text-xs text-[var(--ink)]">
            {formatClock(hud.quarterClock)}
          </span>
        </div>
      </header>

      <div className="relative mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-2">
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none rounded-xl border border-[var(--line)] bg-[#0c1220]"
        />

        {intro ? (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl px-3 py-4 text-center">
            <div className="animate-tipoff-fly flex h-full flex-col items-center justify-center gap-4 pb-16">
              <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[#fff7ed] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:text-4xl">
                <span className="text-[#fb923c]">
                  {you.year} {you.team.abbreviation}
                </span>
                <span className="mx-2 text-[#fdba74]">vs</span>
                <span className="text-[#60a5fa]">
                  {opp.year} {opp.team.abbreviation}
                </span>
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#fdba74] drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                You attack this way
              </p>
            </div>
            <button
              type="button"
              onClick={beginTipOff}
              className="pointer-events-auto absolute bottom-4 left-1/2 z-30 -translate-x-1/2 animate-tipoff-fade rounded-2xl border-2 border-[#fb923c] bg-[#ea580c]/85 px-8 py-3 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#fff7ed] shadow-[0_0_28px_rgba(249,115,22,0.55)]"
            >
              Let&apos;s ball
            </button>
          </div>
        ) : null}

        {hud.meter ? (
          <div className="pointer-events-none absolute left-1/2 top-10 z-10 w-[70%] -translate-x-1/2">
            <ShotMeter
              t={hud.meter.t}
              greenWidth={hud.meter.green}
              frozen={hud.meter.frozen}
            />
          </div>
        ) : null}

        {hud.slowMo && !intro ? (
          <p className="pointer-events-none absolute left-1/2 bottom-3 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#fdba74]">
            Slow-mo
          </p>
        ) : null}

        {hud.msg && !intro ? (
          <p className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-[var(--orange)]/40 bg-black/75 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--orange-hot)] shadow-[0_0_20px_rgba(249,115,22,0.35)]">
            {hud.msg}
          </p>
        ) : null}

        {hud.over ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/75 px-4">
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--orange-hot)]">
              {hud.you === hud.opp
                ? "Tie game"
                : hud.you > hud.opp
                  ? "You win"
                  : "You lose"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              Final {hud.you}–{hud.opp}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border border-[var(--orange)] bg-[var(--orange)]/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]"
            >
              Back to teams
            </button>
          </div>
        ) : null}
      </div>

      {/* Controls dock — one row: stick + spaced actions; difficulty tucked in. */}
      {!hud.over && !intro ? (
        <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-col gap-1 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(["easy", "normal", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] ${
                    difficulty === level
                      ? "border-[var(--orange)] bg-[var(--orange)]/30 text-[var(--ink)]"
                      : "border-[var(--line)] bg-black/40 text-[var(--muted)]"
                  }`}
                >
                  {COURT_DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Court Call info"
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen(true)}
              className="info-glow flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--orange)] bg-black/40 text-sm font-semibold italic leading-none text-[var(--orange-hot)]"
            >
              i
            </button>
          </div>

          {isTouch ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Joystick
                visible
                onChange={(nx, ny, active) => {
                  stickRef.current = { active, nx, ny };
                }}
              />
              <div className="flex min-w-0 flex-1 items-center justify-evenly gap-1.5">
                <ActionBtn label="Steal" onPress={() => queueAction("steal")} />
                <ActionBtn label="Block" onPress={() => queueAction("block")} />
                <ActionBtn label="Board" onPress={() => queueAction("rebound")} />
                <ActionBtn label="Shoot" onPress={() => queueAction("shoot")} />
                <ActionBtn label="Pass" onPress={() => queueAction("pass")} />
              </div>
            </div>
          ) : (
            <p className="pb-1 text-center text-[10px] text-[var(--muted)]">
              Arrows/WASD = screen directions · Space shoot · K pass · F block · G
              steal · H board · {COURT_DIFFICULTY_LABELS[difficulty]}
            </p>
          )}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-center gap-2 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          <button
            type="button"
            aria-label="Court Call info"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen(true)}
            className="info-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--orange)] bg-black/40 text-base font-semibold italic leading-none text-[var(--orange-hot)]"
          >
            i
          </button>
        </div>
      )}

      {infoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 sm:items-center sm:pb-0"
          onClick={() => setInfoOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={infoTitleId}
            className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[#1a100c] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={infoTitleId}
              className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)]"
            >
              Court Call
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              {COURT_CALL_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="mt-5 w-full rounded-full border border-[var(--orange)] bg-[var(--orange)]/20 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)]"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShotMeter({
  t,
  greenWidth,
  frozen,
}: {
  t: number;
  greenWidth: number;
  frozen: boolean;
}) {
  const z = meterZones(greenWidth);
  const grade = meterGrade(t, greenWidth);
  const gradeLabel =
    grade === "green" ? "Money" : grade === "yellow" ? "Okay" : "Off";
  const gradeColor =
    grade === "green"
      ? "text-emerald-400"
      : grade === "yellow"
        ? "text-amber-300"
        : "text-red-400";
  return (
    <div className="rounded-full border border-[var(--line)] bg-black/70 p-1.5 shadow-lg">
      <div className="relative h-3.5 w-full overflow-hidden rounded-full">
        {/* Red base (full bar) */}
        <div className="absolute inset-0 bg-red-600/75" />
        {/* Yellow surround */}
        <div
          className="absolute inset-y-0 bg-amber-400/85"
          style={{
            left: `${z.yellowStart * 100}%`,
            width: `${(z.yellowEnd - z.yellowStart) * 100}%`,
          }}
        />
        {/* Green sweet spot */}
        <div
          className="absolute inset-y-0 bg-emerald-500"
          style={{
            left: `${z.greenStart * 100}%`,
            width: `${greenWidth * 100}%`,
          }}
        />
        <div
          className={`absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full ${
            frozen ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" : "bg-[var(--ink)]"
          }`}
          style={{ left: `${t * 100}%` }}
        />
      </div>
      <p
        className={`mt-1 text-center text-[9px] font-bold uppercase tracking-[0.16em] ${
          frozen ? gradeColor : "text-[var(--muted)]"
        }`}
      >
        {frozen
          ? `Release · ${gradeLabel}`
          : "Tap shoot again — green / yellow / red"}
      </p>
    </div>
  );
}

function ActionBtn({
  label,
  sub,
  onPress,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-[var(--orange)]/70 bg-black/55 text-[7px] font-bold uppercase leading-tight tracking-wide text-[var(--ink)] active:bg-[var(--orange)]/40 sm:h-11 sm:w-11 sm:text-[8px]"
    >
      <span>{label}</span>
      {sub ? <span className="text-[8px] text-[var(--muted)]">{sub}</span> : null}
    </button>
  );
}

function Joystick({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (nx: number, ny: number, active: boolean) => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  if (!visible) return null;

  const update = (clientX: number, clientY: number, active: boolean) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = rect.width * 0.38;
    const m = Math.hypot(dx, dy);
    if (m > max) {
      dx = (dx / m) * max;
      dy = (dy / m) * max;
    }
    setKnob({ x: dx, y: dy });
    onChange(dx / max, dy / max, active);
  };

  return (
    <div
      ref={baseRef}
      className="relative z-10 h-[4.25rem] w-[4.25rem] shrink-0 touch-none rounded-full border border-[var(--line)] bg-black/45 sm:h-20 sm:w-20"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY, true);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        update(e.clientX, e.clientY, true);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setKnob({ x: 0, y: 0 });
        onChange(0, 0, false);
      }}
      onPointerCancel={() => {
        setKnob({ x: 0, y: 0 });
        onChange(0, 0, false);
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--orange)]/55"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

function stepInbound(state: GameState, now: number) {
  const ib = state.inbound;
  if (!ib) return;

  const from = state.actors.find((a) => a.id === ib.fromId);
  const to = state.actors.find((a) => a.id === ib.toId);
  if (!from || !to) {
    state.inbound = null;
    return;
  }

  // Still running to the baseline — ball stays with the inbounder.
  if (ib.releaseAt == null) {
    state.ball.ownerId = from.id;
    state.ball.inAir = false;
    state.ball.loose = false;
    placeDribbleBall(state, from, now);
    const spot = inboundRunTarget(from, ib);
    if (dist(from.x, from.y, spot.x, spot.y) < 2.4) {
      ib.releaseAt = now + 450;
      ib.catchAt = now + 950;
      state.message = "Inbound";
      state.messageUntil = now + 1200;
    } else if (state.lastScorer === "you") {
      state.message = "Swish!";
      state.messageUntil = Math.max(state.messageUntil, now + 400);
    } else {
      state.message = "Inbound coming";
      state.messageUntil = Math.max(state.messageUntil, now + 400);
    }
    return;
  }

  if (now < ib.releaseAt) {
    state.ball.ownerId = from.id;
    state.ball.inAir = false;
    state.ball.loose = false;
    placeDribbleBall(state, from, now);
    state.message = "Inbound";
    state.messageUntil = Math.max(state.messageUntil, ib.catchAt ?? now + 800);
    return;
  }

  if (ib.catchAt != null && now < ib.catchAt) {
    const u = (now - ib.releaseAt) / Math.max(1, ib.catchAt - ib.releaseAt);
    state.ball.ownerId = null;
    state.ball.inAir = true;
    state.ball.loose = false;
    state.ball.targetBasket = null;
    state.ball.x = from.x + (to.x - from.x) * u;
    state.ball.y = from.y + (to.y - from.y) * u;
    state.ball.vx = 0;
    state.ball.vy = 0;
    return;
  }

  // Catch — receiving team has possession, play on.
  state.ball.ownerId = to.id;
  state.ball.inAir = false;
  state.ball.loose = false;
  state.ball.x = to.x;
  state.ball.y = to.y;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.inbound = null;
  state.message = to.side === "you" ? "Your ball" : "Opp ball";
  state.messageUntil = now + 900;
  burstFx(state, to.x, to.y, to.side === "you" ? "#fb923c" : "#60a5fa", 10);
}

function stepGame(
  state: GameState,
  dt: number,
  now: number,
  move: { x: number; y: number },
  actions: Array<"shoot" | "pass" | "steal" | "block" | "rebound">,
  tuning: ReturnType<typeof difficultyTuning>,
) {
  // After a make: everyone runs to inbound spots — no teleports.
  if (state.inbound) {
    const ib = state.inbound;
    stepInbound(state, now);
    for (const a of state.actors) {
      if (a.id === state.controlId && a.side === "you") {
        // You can jog with the transition; if you're the inbounder and idle, auto-jog there.
        a.vx = move.x * 14;
        a.vy = move.y * 14;
        if (a.id === ib.fromId && Math.hypot(move.x, move.y) < 0.2) {
          const spot = inboundRunTarget(a, ib);
          steerTo(a, spot.x, spot.y, dt, 14 * 7);
        }
      } else {
        const spot = inboundRunTarget(a, ib);
        const rush = a.id === ib.fromId ? 22 : 16;
        steerTo(a, spot.x, spot.y, dt, rush * tuning.aiSpeed * 7);
      }
      updateFacing(a);
      a.x = clamp(a.x + a.vx * dt, PLAYER_R + 0.4, W - PLAYER_R - 0.4);
      a.y = clamp(a.y + a.vy * dt, PLAYER_R + 0.4, H - PLAYER_R - 0.4);
      a.vx *= 0.88;
      a.vy *= 0.88;
    }
    separateActors(state.actors);
    if (state.inbound && state.inbound.releaseAt == null) {
      const from = state.actors.find((a) => a.id === state.inbound!.fromId);
      if (from) placeDribbleBall(state, from, now);
    } else if (
      state.inbound?.releaseAt != null &&
      now < state.inbound.releaseAt
    ) {
      const from = state.actors.find((a) => a.id === state.inbound!.fromId);
      if (from) placeDribbleBall(state, from, now);
    }
    return;
  }

  // Shot meter up — freeze the court; only the needle moves until release.
  if (state.meter.active) {
    for (const a of state.actors) {
      a.vx = 0;
      a.vy = 0;
    }
    const owner = state.ball.ownerId
      ? state.actors.find((a) => a.id === state.ball.ownerId)
      : null;
    if (owner) placeDribbleBall(state, owner, now);
    const meterSpd = liveMeterSpeed(state, tuning);
    state.meter.t += state.meter.dir * meterSpd * dt;
    if (state.meter.t >= 1) {
      state.meter.t = 1;
      state.meter.dir = -1;
    } else if (state.meter.t <= 0) {
      state.meter.t = 0;
      state.meter.dir = 1;
    }
    for (const action of actions) {
      if (action === "shoot") handleAction(state, action, now, tuning);
    }
    for (const a of state.actors) {
      updateActorFaceLive(state, a, dt, now);
    }
    return;
  }

  const speed = 18;
  const controlled = state.actors.find((a) => a.id === state.controlId);
  if (controlled && controlled.side === "you") {
    controlled.vx = move.x * speed;
    controlled.vy = move.y * speed;
  }

  // Corner-camping clock — defenders get hungrier the longer you stand still.
  const youOwner =
    state.ball.ownerId?.startsWith("you-") && !state.ball.inAir && !state.ball.loose
      ? state.actors.find((a) => a.id === state.ball.ownerId)
      : null;
  if (youOwner) {
    const speedNow = Math.hypot(youOwner.vx, youOwner.vy);
    state.campTimer = speedNow < 3.5 ? state.campTimer + dt : Math.max(0, state.campTimer - dt * 1.5);
  } else {
    state.campTimer = 0;
  }

  for (const a of state.actors) {
    if (a.id === state.controlId && a.side === "you") continue;
    aiThink(state, a, dt, tuning, now);
  }

  for (const a of state.actors) {
    updateFacing(a);
    a.x = clamp(a.x + a.vx * dt, PLAYER_R + 0.4, W - PLAYER_R - 0.4);
    a.y = clamp(a.y + a.vy * dt, PLAYER_R + 0.4, H - PLAYER_R - 0.4);
    a.vx *= 0.86;
    a.vy *= 0.86;
    updateActorFaceLive(state, a, dt, now);
  }
  separateActors(state.actors, state.ball.ownerId);

  const owner = state.ball.ownerId
    ? state.actors.find((a) => a.id === state.ball.ownerId)
    : null;
  if (owner && !state.ball.inAir && !state.ball.loose) {
    placeDribbleBall(state, owner, now);
  } else if (state.ball.loose) {
    // Slow floating rebound — hangs in the air so crashes feel live.
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;
    state.ball.vx *= 0.988;
    state.ball.vy *= 0.988;
    // Soft floor bias so it eventually settles instead of skating forever.
    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    if (speed > 14) {
      state.ball.vx *= 14 / speed;
      state.ball.vy *= 14 / speed;
    }
    if (state.ball.x < 2 || state.ball.x > W - 2) {
      state.ball.vx *= -0.55;
      state.ball.x = clamp(state.ball.x, 2, W - 2);
    }
    if (state.ball.y < 2 || state.ball.y > H - 2) {
      state.ball.vy *= -0.55;
      state.ball.y = clamp(state.ball.y, 2, H - 2);
    }
    tryGrabLooseBall(state, now);
  } else if (state.ball.inAir) {
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;
    // Keep shot velocity steady so flight time matches the launch math.
    if (!state.ball.targetBasket) {
      state.ball.vx *= 0.997;
      state.ball.vy *= 0.997;
    }
    const basketY = state.ball.targetBasket === "opp" ? 4 : H - 4;
    if (dist(state.ball.x, state.ball.y, 25, basketY) < SHOT_HIT_RADIUS) {
      resolveShot(state, now, tuning);
    } else if (
      state.ball.x < 0 ||
      state.ball.x > W ||
      state.ball.y < 0 ||
      state.ball.y > H
    ) {
      // Kick it back in as a live loose ball near the sideline — no teleport.
      state.ball.x = clamp(state.ball.x, 3, W - 3);
      state.ball.y = clamp(state.ball.y, 3, H - 3);
      state.ball.vx = (25 - state.ball.x) * 0.22;
      state.ball.vy = (H / 2 - state.ball.y) * 0.14;
      state.ball.inAir = false;
      state.ball.loose = true;
      state.ball.ownerId = null;
      state.ball.shooterId = null;
      state.ball.targetBasket = null;
      state.ball.timing = null;
      state.message = "Loose ball!";
      state.messageUntil = now + 900;
    } else {
      // AI / player can tip or block while the shot is up.
      tryAerialContest(state, now, tuning);
    }
  }

  for (const action of actions) {
    handleAction(state, action, now, tuning);
  }

}

function applySpacingSteer(state: GameState, a: Actor, dt: number) {
  // Ball handler shouldn't get shoved sideways by sticky defenders.
  if (state.ball.ownerId === a.id) return;
  for (const other of state.actors) {
    if (other.id === a.id) continue;
    const dx = a.x - other.x;
    const dy = a.y - other.y;
    const d = Math.hypot(dx, dy) || 0.01;
    if (d < MIN_SEPARATION * 1.15) {
      // Ease off when the other guy has the ball so drives can slip through.
      const againstHandler = state.ball.ownerId === other.id ? 0.45 : 1;
      const force =
        ((MIN_SEPARATION * 1.15 - d) / MIN_SEPARATION) * 36 * dt * againstHandler;
      a.vx += (dx / d) * force;
      a.vy += (dy / d) * force;
    }
  }
}

function slotLaneX(slot: CourtPos): number {
  if (slot === "PG") return 25;
  if (slot === "SG" || slot === "PF") return 13;
  return 37;
}

function actorPhase(a: Actor, now: number): number {
  let h = 0;
  for (let i = 0; i < a.id.length; i++) h = (h * 31 + a.id.charCodeAt(i)) >>> 0;
  return (now / 1000) * (0.7 + (h % 7) * 0.12) + (h % 100) * 0.07;
}

/** Active off-ball cuts, screens, and spot-ups toward the attack basket. */
function offenseSpot(
  a: Actor,
  ballOwner: Actor | null,
  now: number,
  state: GameState,
): { x: number; y: number } {
  const attackY = a.side === "you" ? 9 : H - 9;
  const wingY = a.side === "you" ? 26 : H - 26;
  const elbowY = a.side === "you" ? 36 : H - 36;
  const phase = actorPhase(a, now);
  // Faster role cycling so they cut / screen / space like a live offense.
  const mode = Math.floor(phase * 1.35) % 5;
  const wobble = Math.sin(phase * 2.4) * 3.2;
  const lane = slotLaneX(a.slot);
  const towardRim = a.side === "you" ? -1 : 1;

  if (a.slot === "C") {
    // Big: duck-in, seal, or set a ball screen.
    if (mode <= 1 && ballOwner) {
      const stopper = onBallDefender(state, ballOwner);
      if (stopper) {
        return {
          x: clamp(stopper.x + (ballOwner.x - stopper.x) * 0.35 + wobble * 0.3, 8, W - 8),
          y: clamp(stopper.y + towardRim * 1.2, 6, H - 6),
        };
      }
    }
    return {
      x: clamp(25 + wobble * 0.7, 10, 40),
      y: clamp(attackY + (a.side === "you" ? 7 : -7) + Math.cos(phase) * 2.5, 6, H - 6),
    };
  }

  if (mode === 0) {
    // Hard cut to the rim
    return {
      x: clamp(25 + (lane - 25) * 0.35 + wobble * 0.5, 7, W - 7),
      y: clamp(attackY + Math.sin(phase) * 1.5, 5, H - 5),
    };
  }
  if (mode === 1) {
    // Wing spot-up / spacing
    return {
      x: clamp(lane + (lane < 25 ? -3 : 3) + wobble * 0.4, 5, W - 5),
      y: clamp(wingY + Math.cos(phase * 1.4) * 3.5, 8, H - 8),
    };
  }
  if (mode === 2 && ballOwner) {
    // Flash to the ball for a handoff / kick-out
    return {
      x: clamp(ballOwner.x + (lane - 25) * 0.5 + wobble, 6, W - 6),
      y: clamp(
        ballOwner.y + towardRim * -6 + Math.sin(phase) * 2,
        6,
        H - 6,
      ),
    };
  }
  if (mode === 3 && ballOwner) {
    // Set a screen on the on-ball defender
    const stopper = onBallDefender(state, ballOwner);
    if (stopper) {
      const dx = ballOwner.x - stopper.x;
      const dy = ballOwner.y - stopper.y;
      const m = Math.hypot(dx, dy) || 1;
      // Plant next to the defender, toward the ball — classic ball-screen angle.
      return {
        x: clamp(stopper.x + (dx / m) * 1.4 + (-dy / m) * 1.1, 6, W - 6),
        y: clamp(stopper.y + (dy / m) * 1.4 + (dx / m) * 1.1, 6, H - 6),
      };
    }
  }
  // Elbow / high post / curl
  return {
    x: clamp(lane * 0.5 + 25 * 0.5 + wobble * 0.6, 8, W - 8),
    y: clamp(elbowY + Math.sin(phase * 1.8) * 4.5, 10, H - 10),
  };
}

/** Matching-slot man assignment on the other team. */
function manAssignment(a: Actor, state: GameState): Actor | null {
  return (
    state.actors.find((o) => o.side !== a.side && o.slot === a.slot) ?? null
  );
}

function onBallDefender(state: GameState, ballOwner: Actor): Actor | null {
  return (
    state.actors.find(
      (d) => d.side !== ballOwner.side && manAssignment(d, state)?.id === ballOwner.id,
    ) ?? null
  );
}

/**
 * Man-to-man shade between the assignment and the basket.
 * Intentionally lags movers so handlers can juke / blow by.
 */
function defenseSpot(
  a: Actor,
  assignment: Actor,
  ballOwner: Actor | null,
  now: number,
): { x: number; y: number } {
  const phase = actorPhase(a, now);
  const basketY = a.side === "you" ? H - 4 : 4;
  const onBall = ballOwner?.id === assignment.id;
  const manSpeed = Math.hypot(assignment.vx, assignment.vy);

  // Reaction lag — faster movers get defenders crossed up.
  const lag = onBall ? 0.22 + Math.min(0.28, manSpeed * 0.018) : 0.1;
  const predX = assignment.x - assignment.vx * lag;
  const predY = assignment.y - assignment.vy * lag;

  const toBx = 25 - predX;
  const toBy = basketY - predY;
  const toB = Math.hypot(toBx, toBy) || 1;
  // Comfortable cushion — never sit on top of the ball.
  const cushion = onBall ? (manSpeed < 3 ? 3.4 : 4.2) : 2.9;
  const wobbleX = Math.sin(phase * 2.2) * (onBall ? 0.7 : 1.3);
  const wobbleY = Math.cos(phase * 1.7) * (onBall ? 0.45 : 1.0);

  let x = predX + (toBx / toB) * cushion + wobbleX;
  let y = predY + (toBy / toB) * cushion + wobbleY;

  // Blown by: man is closer to the rim than we are — recover to the paint.
  const manToRim = dist(assignment.x, assignment.y, 25, basketY);
  const meToRim = dist(a.x, a.y, 25, basketY);
  if (manToRim < meToRim - 1.2) {
    x = assignment.x * 0.35 + 25 * 0.65;
    y = assignment.y * 0.4 + basketY * 0.6;
  } else if (!onBall && ballOwner) {
    // Off-ball: stay with man, light ball help — don't leave the cut.
    x = x * 0.78 + ballOwner.x * 0.12 + assignment.x * 0.1;
    y = y * 0.82 + assignment.y * 0.18;
  }

  return { x: clamp(x, 3.5, W - 3.5), y: clamp(y, 3.5, H - 3.5) };
}

/** How many defenders are glued to the ball handler (for meter + steals). */
function defensePressure(state: GameState, handler: Actor) {
  const foes = state.actors.filter((a) => a.side !== handler.side);
  let close = 0;
  let veryClose = 0;
  let nearest = 99;
  for (const d of foes) {
    const dDist = dist(d.x, d.y, handler.x, handler.y);
    nearest = Math.min(nearest, dDist);
    if (dDist < 4.2) close += 1;
    if (dDist < 2.85) veryClose += 1;
  }
  return { close, veryClose, nearest };
}

/** Faster meter when contested / deep; slower when open near the rim. */
function liveMeterSpeed(
  state: GameState,
  tuning: ReturnType<typeof difficultyTuning>,
) {
  const shooter =
    state.actors.find((a) => a.id === state.controlId) ??
    state.actors.find((a) => a.id === state.ball.ownerId);
  if (!shooter) return tuning.meterSpeed;

  const basketY = shooter.side === "you" ? 4 : H - 4;
  const distance = dist(shooter.x, shooter.y, 25, basketY);
  // 0 near rim (~6ft), 1 at deep three / beyond (~28+)
  const distFactor = clamp((distance - 6) / 22, 0, 1.15);
  const { close, veryClose, nearest } = defensePressure(state, shooter);
  const contestFactor =
    veryClose * 0.38 + close * 0.16 + clamp((3.6 - nearest) / 3.6, 0, 1) * 0.45;

  return tuning.meterSpeed * (0.55 + distFactor * 0.75 + contestFactor * 0.95);
}

function steerTo(
  a: Actor,
  targetX: number,
  targetY: number,
  dt: number,
  accel: number,
) {
  const dx = targetX - a.x;
  const dy = targetY - a.y;
  const m = Math.hypot(dx, dy) || 1;
  a.vx += (dx / m) * accel * dt;
  a.vy += (dy / m) * accel * dt;
}

function tryGrabLooseBall(state: GameState, now: number) {
  // Human must press Block/Steal next to the ball — no auto-board for the locked player.
  const grabbers = state.actors
    .filter((a) => a.id !== state.controlId)
    .map((a) => ({ a, d: dist(a.x, a.y, state.ball.x, state.ball.y) }))
    .filter((g) => g.d < REBOUND_REACH)
    .sort((p, q) => p.d - q.d - (p.a.defense - q.a.defense) * 0.01);
  const best = grabbers[0];
  if (!best) return;
  // AI boards are deliberate — wait until they're truly under it.
  if (best.d > 1.55 && Math.random() > 0.28) return;
  if (best.d > 1.1 && Math.random() > 0.5) return;
  state.ball.loose = false;
  state.ball.inAir = false;
  state.ball.ownerId = best.a.id;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.x = best.a.x;
  state.ball.y = best.a.y;
  resetShotClock(state);
  state.message = `${best.a.lastName} boards!`;
  state.messageUntil = now + 900;
  burstFx(state, best.a.x, best.a.y, best.a.side === "you" ? "#fb923c" : "#60a5fa", 10);
}

function tryAerialContest(
  state: GameState,
  now: number,
  tuning: ReturnType<typeof difficultyTuning>,
) {
  if (!state.ball.inAir || state.ball.loose || !state.ball.shooterId) return;
  const shooter = state.actors.find((a) => a.id === state.ball.shooterId);
  for (const a of state.actors) {
    if (a.id === state.controlId) continue;
    if (shooter && a.side === shooter.side) continue;
    const d = dist(a.x, a.y, state.ball.x, state.ball.y);
    if (d > 2.8) continue;
    const rate =
      0.012 *
      tuning.aiSpeed *
      clamp((a.defense - (shooter?.offense ?? 70) + 40) / 100, 0.4, 1.4);
    if (Math.random() < rate) {
      // Tip into a live loose ball — no teleport.
      state.ball.loose = true;
      state.ball.inAir = false;
      state.ball.ownerId = null;
      state.ball.shooterId = null;
      state.ball.targetBasket = null;
      state.ball.timing = null;
      state.ball.vx = (Math.random() - 0.5) * 8 + a.vx * 0.2;
      state.ball.vy = (Math.random() - 0.5) * 8 + a.vy * 0.2;
      state.ball.x = a.x + (Math.random() - 0.5) * 2;
      state.ball.y = a.y + (Math.random() - 0.5) * 2;
      state.message = `${a.lastName} rejects!`;
      state.messageUntil = now + 1800;
      burstFx(state, a.x, a.y, "#93c5fd", 14);
      burstText(state, a.x, a.y - 3, "BLOCK", "#93c5fd");
      if (shooter?.id === state.controlId) beginSlowMo(state, now, 900);
      return;
    }
  }
}

function nearestFoeDist(state: GameState, a: Actor): number {
  let best = 99;
  for (const o of state.actors) {
    if (o.side === a.side) continue;
    best = Math.min(best, dist(a.x, a.y, o.x, o.y));
  }
  return best;
}

function aiThink(
  state: GameState,
  a: Actor,
  dt: number,
  tuning: ReturnType<typeof difficultyTuning>,
  now: number,
) {
  const hasBall = state.ball.ownerId === a.id && !state.ball.loose;
  const attackBasketY = a.side === "you" ? 4 : H - 4;
  const defendBasketY = a.side === "you" ? H - 4 : 4;
  const spd = 15 * tuning.aiSpeed;
  const ballOwner =
    state.ball.ownerId && !state.ball.loose
      ? state.actors.find((x) => x.id === state.ball.ownerId) ?? null
      : null;
  const teamHasBall = Boolean(
    state.ball.ownerId?.startsWith(a.side) && !state.ball.loose,
  );

  if (state.ball.loose) {
    steerTo(a, state.ball.x, state.ball.y, dt, 17 * tuning.aiSpeed * 8);
    applySpacingSteer(state, a, dt);
    return;
  }

  if (hasBall && !state.ball.inAir) {
    const phase = actorPhase(a, now);
    const attackMode = Math.floor(phase * 0.55) % 4;
    const gap = nearestFoeDist(state, a);
    const rimY = attackBasketY + (a.side === "you" ? 9 : -9);
    let targetX: number;
    let targetY: number;
    if (attackMode === 0 || gap > 3.8) {
      // Explode to the rim / blow-by lane
      targetX = clamp(25 + Math.sin(phase * 3.1) * 2.5, 10, W - 10);
      targetY = rimY;
    } else if (attackMode === 1) {
      // Drive the slot lane
      targetX = clamp(slotLaneX(a.slot) + Math.sin(phase * 2) * 2, 7, W - 7);
      targetY = rimY + (a.side === "you" ? 4 : -4);
    } else if (attackMode === 2) {
      // Hesitation juke, then attack
      targetX = clamp(a.x + Math.sin(phase * 5.5) * 7, 6, W - 6);
      targetY = clamp(a.y + (a.side === "you" ? -3 : 3), 6, H - 6);
    } else {
      // Attack middle off a screen angle
      targetX = clamp(25 + Math.cos(phase * 2.2) * 5, 9, W - 9);
      targetY = rimY + (a.side === "you" ? 6 : -6);
    }
    const driveAccel = gap > 3.5 ? spd * 11.5 : spd * 8.5;
    steerTo(a, targetX, targetY, dt, driveAccel);

    const rimDist = dist(a.x, a.y, 25, attackBasketY);
    // Shoot a lot more — paint, midrange, and pull-ups.
    const shootRate =
      rimDist < 11
        ? 2.6
        : rimDist < 16
          ? 1.9
          : rimDist < 22
            ? 1.15
            : rimDist < 28
              ? 0.55
              : 0.12;
    if (Math.random() < dt * shootRate * tuning.aiSpeed) {
      launchShot(state, a, 0.48 + (Math.random() - 0.5) * 0.28);
    } else if (Math.random() < dt * 0.22) {
      const mates = state.actors
        .filter((t) => t.side === a.side && t.id !== a.id)
        .sort(
          (p, q) =>
            dist(p.x, p.y, 25, attackBasketY) - dist(q.x, q.y, 25, attackBasketY),
        );
      // Prefer cutters near the rim
      const target = mates.find((m) => dist(m.x, m.y, 25, attackBasketY) < 16) ?? mates[0];
      if (target && dist(a.x, a.y, target.x, target.y) < 24) {
        doPass(state, a, target);
      }
    }
    applySpacingSteer(state, a, dt);
    return;
  }

  if (state.ball.inAir) {
    const crashX = state.ball.x + (slotLaneX(a.slot) - 25) * 0.2;
    const crashY = state.ball.y + (a.side === "you" ? 1.5 : -1.5);
    steerTo(a, crashX, crashY, dt, 15 * tuning.aiSpeed * 8);
    applySpacingSteer(state, a, dt);
    return;
  }

  if (teamHasBall) {
    const spot = offenseSpot(a, ballOwner, now, state);
    // Cutters sprint; screeners plant a bit slower.
    const cutting = dist(spot.x, spot.y, 25, attackBasketY) < 14;
    steerTo(a, spot.x, spot.y, dt, spd * (cutting ? 9.2 : 7.2));
  } else if (ballOwner) {
    const assignment = manAssignment(a, state);
    if (!assignment) {
      applySpacingSteer(state, a, dt);
      return;
    }

    // Transition D — sprint back if still stuck in the frontcourt.
    const inFrontcourt =
      a.side === "you" ? a.y < H * 0.48 : a.y > H * 0.52;
    const ballAttackingUs =
      a.side === "you" ? ballOwner.y > H * 0.42 : ballOwner.y < H * 0.58;
    if (inFrontcourt && ballAttackingUs) {
      const recoverY =
        a.side === "you"
          ? Math.max(assignment.y, ballOwner.y, H * 0.58)
          : Math.min(assignment.y, ballOwner.y, H * 0.42);
      steerTo(a, assignment.x * 0.7 + 25 * 0.3, recoverY, dt, spd * 12);
      applySpacingSteer(state, a, dt);
      return;
    }

    const onBall = assignment.id === ballOwner.id;
    const camping =
      ballOwner.side === "you" &&
      state.campTimer > 1.6;
    const blownBy =
      dist(assignment.x, assignment.y, 25, defendBasketY) <
      dist(a.x, a.y, 25, defendBasketY) - 1.2;
    const spot = defenseSpot(a, assignment, ballOwner, now);
    // Chase hard when beaten; stay patient on-ball so jukes work.
    const defAccel = blownBy
      ? spd * 11
      : onBall
        ? spd * 6.2
        : spd * 7.4;
    steerTo(a, spot.x, spot.y, dt, defAccel);

    // Steals — rarer unless the handler is camping AFK.
    const pressure = defensePressure(state, ballOwner);
    const myDist = dist(a.x, a.y, state.ball.x, state.ball.y);
    const camp = ballOwner.side === "you" ? state.campTimer : 0;
    const stealReach = (onBall ? STEAL_REACH - 0.15 : STEAL_REACH - 0.35) + (camp > 2 ? 0.25 : 0);
    if (myDist < stealReach && !blownBy) {
      const baseRate = onBall ? 0.18 : 0.05;
      const stealRate =
        (baseRate + Math.min(1.2, camp * 0.35) + (camping ? 0.4 : 0)) *
        tuning.aiSpeed;
      if (Math.random() < dt * stealRate) {
        const chance = clamp(
          (a.defense - ballOwner.pass) / 140 +
            0.08 +
            pressure.veryClose * 0.05 +
            Math.min(0.4, camp * 0.12),
          0.08,
          camp > 2.8 ? 0.7 : 0.38,
        );
        if (Math.random() < chance) {
          state.ball.ownerId = a.id;
          state.campTimer = 0;
          resetShotClock(state);
          state.message =
            camp > 2 ? `${a.lastName} takes it!` : `${a.lastName} steals!`;
          state.messageUntil = now + 1000;
          burstFx(state, a.x, a.y, "#34d399", 14);
          burstText(state, a.x, a.y - 3, "STEAL", "#34d399");
        }
      }
    }
  } else {
    const spot = offenseSpot(a, null, now, state);
    steerTo(a, spot.x, spot.y, dt, spd * 5.5);
  }
  applySpacingSteer(state, a, dt);
}

function handleAction(
  state: GameState,
  action: "shoot" | "pass" | "steal" | "block" | "rebound",
  now: number,
  tuning: ReturnType<typeof difficultyTuning>,
) {
  const me =
    state.actors.find((a) => a.id === state.controlId && a.side === "you") ??
    state.actors.find((a) => a.side === "you")!;

  if (action === "shoot") {
    if (
      state.meter.active &&
      state.ball.ownerId === me.id &&
      !state.ball.inAir &&
      !state.ball.loose
    ) {
      const timing = state.meter.t;
      state.meter.active = false;
      state.meter.holdUntil = now + 1100;
      launchShot(state, me, timing);
      const grade = meterGrade(timing, tuning.greenWidth);
      state.message =
        grade === "green"
          ? `${me.lastName} — money!`
          : grade === "yellow"
            ? "Release · okay"
            : "Release · off";
      state.messageUntil = now + 1600;
      const color =
        grade === "green" ? "#34d399" : grade === "yellow" ? "#fbbf24" : "#f87171";
      burstFx(state, me.x, me.y, color, grade === "green" ? 14 : 8);
      return;
    }
    if (
      state.ball.ownerId === me.id &&
      !state.ball.inAir &&
      !state.ball.loose &&
      !state.meter.active &&
      now >= state.meter.holdUntil
    ) {
      state.meter = {
        active: true,
        t: 0,
        dir: 1,
        startedAt: now,
        holdUntil: 0,
      };
      for (const a of state.actors) {
        a.vx = 0;
        a.vy = 0;
      }
      state.message = "Time the meter";
      state.messageUntil = now + 600;
    }
    return;
  }

  if (action === "pass") {
    if (state.meter.active || now < state.meter.holdUntil) return;
    if (state.ball.ownerId === me.id && !state.ball.inAir && !state.ball.loose) {
      const mates = state.actors.filter((t) => t.side === "you" && t.id !== me.id);
      const facing = mates
        .map((t) => {
          const dx = t.x - me.x;
          const dy = t.y - me.y;
          const moveDot = dx * me.vx + dy * me.vy;
          return { t, score: dist(t.x, t.y, me.x, me.y) - (moveDot > 0 ? 4 : 0) };
        })
        .sort((a, b) => a.score - b.score);
      const target = facing[0]?.t ?? mates[0];
      if (target) {
        doPass(state, me, target);
        state.message = `Pass → ${target.lastName}`;
        state.messageUntil = now + 700;
        burstFx(state, target.x, target.y, "#fdba74", 10);
      }
    }
    return;
  }

  if (action === "steal") {
    if (state.meter.active) return;
    if (state.ball.ownerId?.startsWith("opp-") && !state.ball.inAir) {
      const handler = state.actors.find((a) => a.id === state.ball.ownerId)!;
      // Measure to the live ball, not just the body — must be next to it.
      const d = dist(me.x, me.y, state.ball.x, state.ball.y);
      if (d < STEAL_REACH) {
        const chance = clamp(
          (me.defense - handler.pass + 20) / 120 + tuning.stealBonus,
          0.08,
          0.62,
        );
        if (Math.random() < chance) {
          state.ball.ownerId = me.id;
          resetShotClock(state);
          state.message = "STEAL!";
          state.messageUntil = now + 1000;
          burstFx(state, me.x, me.y, "#34d399", 16);
          burstText(state, me.x, me.y - 3, "STEAL", "#34d399");
        } else {
          state.message = "Steal missed";
          state.messageUntil = now + 700;
        }
      } else {
        state.message = "Get next to the ball";
        state.messageUntil = now + 600;
      }
    }
    return;
  }

  if (action === "rebound") {
    if (state.meter.active) return;
    if (state.ball.loose) {
      tryPlayerRebound(state, me, now);
    } else {
      state.message = "Ball isn't loose";
      state.messageUntil = now + 500;
    }
    return;
  }

  if (action === "block") {
    if (state.meter.active) return;
    if (state.ball.inAir) {
      const d = dist(me.x, me.y, state.ball.x, state.ball.y);
      if (d < BLOCK_REACH) {
        const shooter = state.actors.find((a) => a.id === state.ball.shooterId);
        const chance = clamp(
          (me.defense - (shooter?.offense ?? 70) + 25) / 130 + tuning.stealBonus * 0.5,
          0.12,
          0.65,
        );
        if (Math.random() < chance) {
          // Block tips to a live loose ball — camera stays put.
          state.ball.inAir = false;
          state.ball.loose = true;
          state.ball.ownerId = null;
          state.ball.shooterId = null;
          state.ball.targetBasket = null;
          state.ball.timing = null;
          state.ball.vx = (Math.random() - 0.5) * 7 + me.vx * 0.25;
          state.ball.vy = (Math.random() - 0.5) * 7 + me.vy * 0.25;
          state.ball.x = me.x + (Math.random() - 0.5);
          state.ball.y = me.y + (Math.random() - 0.5);
          state.message = "REJECTED!";
          state.messageUntil = now + 1100;
          burstFx(state, me.x, me.y, "#60a5fa", 18);
          burstText(state, me.x, me.y - 3, "BLOCK", "#93c5fd");
        } else if (d < 2.4 && Math.random() < 0.4) {
          state.ball.inAir = false;
          state.ball.loose = true;
          state.ball.ownerId = null;
          state.ball.timing = null;
          state.ball.vx = (Math.random() - 0.5) * 5;
          state.ball.vy = (Math.random() - 0.5) * 5;
          state.message = "Tip!";
          state.messageUntil = now + 700;
          burstFx(state, me.x, me.y, "#fdba74", 10);
        } else {
          state.message = "No contest";
          state.messageUntil = now + 500;
        }
      } else {
        state.message = "Too far";
        state.messageUntil = now + 500;
      }
    } else {
      state.message = "Wait for the shot";
      state.messageUntil = now + 500;
    }
  }
}

/** Player rebound — only on button press while next to the floating ball. */
function tryPlayerRebound(state: GameState, me: Actor, now: number) {
  const d = dist(me.x, me.y, state.ball.x, state.ball.y);
  if (d > REBOUND_REACH) {
    state.message = "Get next to the ball";
    state.messageUntil = now + 500;
    return;
  }
  state.ball.loose = false;
  state.ball.inAir = false;
  state.ball.ownerId = me.id;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.x = me.x;
  state.ball.y = me.y;
  resetShotClock(state);
  state.message = "BOARD!";
  state.messageUntil = now + 900;
  burstFx(state, me.x, me.y, "#fdba74", 14);
  burstText(state, me.x, me.y - 3, "BOARD", "#fdba74");
}

function nearestContest(state: GameState, shooter: Actor): number {
  return state.actors
    .filter((a) => a.side !== shooter.side)
    .reduce((best, a) => Math.min(best, dist(a.x, a.y, shooter.x, shooter.y)), 99);
}

/**
 * Make odds from release context — open green finishes at the rim are automatic.
 * Uses contest/distance snapped at release so late help doesn't brick a clean look.
 */
function shotMakeChance(
  shooter: Actor,
  distance: number,
  contest: number,
  grade: "green" | "yellow" | "red",
  tuning: ReturnType<typeof difficultyTuning>,
): number {
  const wideOpen = contest >= 4.2;
  const open = contest >= 3.2;
  const tight = contest < 2.5;
  const atRim = distance <= 9;
  const paint = distance <= 14;
  const mid = distance <= 22;

  // Money look: green + wide open + next to the basket → always goes.
  if (grade === "green" && wideOpen && atRim) return 1;
  // Green + open layup / short paint — virtually automatic.
  if (grade === "green" && open && atRim) return 0.99;
  if (grade === "green" && wideOpen && paint) return 0.97;
  if (grade === "green" && open && paint) return 0.94;

  let make = 0.42 + (shooter.offense - 70) / 120 + tuning.makeBonus;

  if (grade === "green") make += 0.34;
  else if (grade === "yellow") make += 0.08;
  else make -= 0.28;

  // Distance falloff (gentler near rim, steeper from deep).
  if (atRim) make += 0.22;
  else if (paint) make += 0.1;
  else if (mid) make -= (distance - 14) / 55;
  else make -= 0.12 + (distance - 22) / 40;

  // Contest pressure from release spacing.
  if (wideOpen) make += 0.14;
  else if (open) make += 0.06;
  else if (tight) make -= tuning.contestPenalty + clamp((2.5 - contest) / 4, 0, 0.2);
  else make -= tuning.contestPenalty * 0.55;

  // Floor/ceiling: bricks can still brick; open greens stay very high.
  if (grade === "green" && open) return clamp(make, 0.82, 0.99);
  if (grade === "green") return clamp(make, 0.55, 0.96);
  if (grade === "yellow") return clamp(make, 0.22, 0.78);
  return clamp(make, 0.04, 0.42);
}

function launchShot(state: GameState, shooter: Actor, timing: number) {
  const target: Side = shooter.side === "you" ? "opp" : "you";
  const basketY = target === "opp" ? 4 : H - 4;
  const dx = 25 - shooter.x;
  const dy = basketY - shooter.y;
  const m = Math.hypot(dx, dy) || 1;
  // Cover distance to the hit radius in a fixed sim-time so every shot feels equal.
  const travel = Math.max(1.2, m - SHOT_HIT_RADIUS * 0.85);
  const speed = travel / SHOT_FLIGHT_SEC;
  state.ball.inAir = true;
  state.ball.loose = false;
  state.ball.ownerId = null;
  state.ball.shooterId = shooter.id;
  state.ball.targetBasket = target;
  state.ball.timing = timing;
  state.ball.releaseContest = nearestContest(state, shooter);
  state.ball.releaseDistance = dist(shooter.x, shooter.y, 25, basketY);
  state.ball.vx = (dx / m) * speed;
  state.ball.vy = (dy / m) * speed;
  state.ball.x = shooter.x;
  state.ball.y = shooter.y;
  state.meter.active = false;
  // Your shot — brief slow-mo sized for the fixed flight window.
  if (shooter.id === state.controlId) {
    beginSlowMo(state, performance.now(), 1200);
  }
}

function doPass(state: GameState, from: Actor, to: Actor) {
  state.ball.ownerId = to.id;
  state.ball.inAir = false;
  state.ball.loose = false;
  state.ball.x = to.x;
  state.ball.y = to.y;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.shooterId = null;
  state.ball.targetBasket = null;
  state.ball.timing = null;
  state.ball.releaseContest = null;
  state.ball.releaseDistance = null;
  void from;
}

function resolveShot(
  state: GameState,
  now: number,
  tuning: ReturnType<typeof difficultyTuning>,
) {
  const shooter = state.actors.find((a) => a.id === state.ball.shooterId);
  if (!shooter) {
    state.ball.inAir = false;
    state.ball.loose = true;
    state.ball.ownerId = null;
    return;
  }
  const basketY = state.ball.targetBasket === "opp" ? 4 : H - 4;
  const distance =
    state.ball.releaseDistance ?? dist(shooter.x, shooter.y, 25, basketY);
  const contest = state.ball.releaseContest ?? nearestContest(state, shooter);

  const timing = state.ball.timing ?? 0.5;
  const grade = meterGrade(timing, tuning.greenWidth);
  const perfect = grade === "green";
  const make = shotMakeChance(shooter, distance, contest, grade, tuning);

  const wasYourShot = shooter.id === state.controlId;
  state.ball.inAir = false;
  state.ball.shooterId = null;
  state.ball.targetBasket = null;
  state.ball.timing = null;
  state.ball.releaseContest = null;
  state.ball.releaseDistance = null;

  if (Math.random() < make) {
    if (shooter.side === "you") state.youScore += 2;
    else state.oppScore += 2;
    resetAfterScore(state, shooter.side);
  } else {
    // Rim bounce — live loose ball for a contested rebound. Camera stays.
    const rimSide = Math.random() < 0.5 ? -1 : 1;
    const scatterX = 25 + rimSide * (2.5 + Math.random() * 7);
    const scatterY =
      basketY +
      (basketY < H / 2 ? 1 : -1) * (3 + Math.random() * 8) +
      (Math.random() - 0.5) * 4;
    state.ball.loose = true;
    state.ball.ownerId = null;
    state.ball.x = clamp(scatterX, 3, W - 3);
    state.ball.y = clamp(scatterY, 3, H - 3);
    state.ball.vx = rimSide * (2.5 + Math.random() * 5) + (Math.random() - 0.5) * 1.5;
    state.ball.vy =
      (basketY < H / 2 ? 1 : -1) * (2 + Math.random() * 4.5) + (Math.random() - 0.5) * 2;
    state.message = perfect ? "Rimmed out!" : "Off the iron";
    state.messageUntil = now + (wasYourShot ? 2200 : 1100);
    burstFx(state, 25, basketY, "#fbbf24", 12);
    burstText(state, 25, basketY - 2, "MISS", "#fbbf24");
    if (wasYourShot) beginSlowMo(state, now, 1000);
  }
}

function updateCamera(state: GameState, dt: number) {
  const controlled = state.actors.find((a) => a.id === state.controlId);
  if (!controlled) return;
  // Sideline 3D camera: pan along the court length, ease across the lane.
  const halfAlong = VIEW_H / 2;
  const targetLane = clamp(controlled.x * 0.35 + 25 * 0.65, 16, W - 16);
  const targetAlong = clamp(controlled.y, halfAlong, H - halfAlong);
  const lerp = 1 - Math.exp(-4.2 * dt);
  state.camX += (targetLane - state.camX) * lerp;
  state.camY += (targetAlong - state.camY) * lerp;
}

function stepFx(state: GameState, dt: number) {
  for (const p of state.fx) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.text ? 2 : 18) * dt;
    p.life -= dt;
  }
  state.fx = state.fx.filter((p) => p.life > 0);
}

function separateActors(actors: Actor[], ballOwnerId: string | null = null) {
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < actors.length; i++) {
      for (let j = i + 1; j < actors.length; j++) {
        const a = actors[i]!;
        const b = actors[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d < 0.0001) {
          dx = pass % 2 === 0 ? 0.25 : -0.25;
          dy = pass % 2 === 0 ? -0.2 : 0.2;
          d = Math.hypot(dx, dy);
        }
        if (d >= MIN_SEPARATION) continue;
        const nx = dx / d;
        const ny = dy / d;
        // Ball handler keeps momentum — defenders get bumped off so they can't pin you.
        let pushA = 0.5;
        let pushB = 0.5;
        if (ballOwnerId === a.id) {
          pushA = 0.22;
          pushB = 0.78;
        } else if (ballOwnerId === b.id) {
          pushA = 0.78;
          pushB = 0.22;
        }
        const overlap = MIN_SEPARATION - d;
        a.x = clamp(a.x - nx * overlap * pushA, PLAYER_R + 0.4, W - PLAYER_R - 0.4);
        a.y = clamp(a.y - ny * overlap * pushA, PLAYER_R + 0.4, H - PLAYER_R - 0.4);
        b.x = clamp(b.x + nx * overlap * pushB, PLAYER_R + 0.4, W - PLAYER_R - 0.4);
        b.y = clamp(b.y + ny * overlap * pushB, PLAYER_R + 0.4, H - PLAYER_R - 0.4);
        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const closing = relVx * nx + relVy * ny;
        if (closing < 0) {
          // Don't kill the handler's drive velocity as hard.
          const dampA = ballOwnerId === a.id ? 0.2 : 0.55;
          const dampB = ballOwnerId === b.id ? 0.2 : 0.55;
          a.vx += nx * closing * dampA;
          a.vy += ny * closing * dampA;
          b.vx -= nx * closing * dampB;
          b.vy -= ny * closing * dampB;
        }
      }
    }
  }
}

/** Orange ball with classic black seams + a light highlight. */
function drawBasketball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spin: number,
) {
  const grad = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.4,
    r * 0.08,
    x,
    y,
    r,
  );
  grad.addColorStop(0, "#fdba74");
  grad.addColorStop(0.45, "#f97316");
  grad.addColorStop(0.85, "#ea580c");
  grad.addColorStop(1, "#9a3412");

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = "rgba(28, 25, 23, 0.92)";
  ctx.lineWidth = Math.max(1.4, r * 0.14);
  ctx.lineCap = "round";

  // Vertical seam
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();

  // Horizontal seam
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();

  // Curved side seams (spin with motion)
  const tilt = Math.sin(spin) * 0.15;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, y, r * 0.72, r * 0.95, tilt, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y, r * 0.72, r * 0.95, -tilt, Math.PI * 0.45, Math.PI * 1.55);
  ctx.stroke();

  ctx.restore();

  // Soft rim outline
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(67, 20, 7, 0.55)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();

  // Specular speck
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.38, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 247, 237, 0.35)";
  ctx.fill();
}

/** Street-park hoop: padded pole, white board, bright rim, white net. */
const woodTile = typeof Image !== "undefined" ? new Image() : null;
const crowdStrip = typeof Image !== "undefined" ? new Image() : null;
let woodReady = false;
let crowdReady = false;
if (woodTile) {
  woodTile.onload = () => {
    woodReady = true;
  };
  woodTile.src = "/court-call/court-wood-tile.jpg";
}
if (crowdStrip) {
  crowdStrip.onload = () => {
    crowdReady = true;
  };
  crowdStrip.src = "/court-call/park-crowd-strip.jpg";
}

function drawHoop3D(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  screenW: number,
  screenH: number,
  alongY: number,
  netDir: 1 | -1,
  active: boolean,
  pulse: number,
) {
  const lane = 25;
  const rim = projectCourt(lane, alongY, cam, screenW, screenH, 3.2);
  const board = projectCourt(lane, alongY - netDir * 1.2, cam, screenW, screenH, 4.4);
  const poleBase = projectCourt(lane, alongY - netDir * 2.2, cam, screenW, screenH, 0);
  const poleTop = projectCourt(lane, alongY - netDir * 1.5, cam, screenW, screenH, 4.0);
  if (!rim || !board || !poleBase || !poleTop) return;

  const s = rim.scale;

  // Pole
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = Math.max(3, s * 0.28);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(poleBase.x, poleBase.y);
  ctx.lineTo(poleTop.x, poleTop.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(poleTop.x, poleTop.y);
  ctx.lineTo(board.x, board.y);
  ctx.stroke();

  // Backboard (billboard quad)
  const bw = 2.8 * s;
  const bh = 1.7 * s;
  ctx.fillStyle = active ? "#f8fafc" : "#e2e8f0";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.fillRect(board.x - bw / 2, board.y - bh / 2, bw, bh);
  ctx.strokeRect(board.x - bw / 2, board.y - bh / 2, bw, bh);
  ctx.strokeStyle = active ? "#ef4444" : "#f87171";
  ctx.strokeRect(board.x - bw * 0.22, board.y - bh * 0.18, bw * 0.44, bh * 0.42);

  // Rim ellipse
  const rimR = 0.95 * s * (active ? pulse : 1);
  ctx.beginPath();
  ctx.ellipse(rim.x, rim.y, rimR, rimR * 0.35, 0, 0, Math.PI * 2);
  ctx.strokeStyle = active ? "#fb923c" : "#ea580c";
  ctx.lineWidth = Math.max(2.4, s * 0.22);
  ctx.stroke();

  // Net
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1, s * 0.08);
  const netLen = 1.4 * s;
  for (let i = 0; i < 8; i++) {
    const t = (i / 7) * 2 - 1;
    ctx.beginPath();
    ctx.moveTo(rim.x + t * rimR * 0.85, rim.y);
    ctx.quadraticCurveTo(
      rim.x + t * rimR * 0.45,
      rim.y + netLen * 0.45,
      rim.x + t * rimR * 0.28,
      rim.y + netLen,
    );
    ctx.stroke();
  }
}

function drawCourt(
  canvas: HTMLCanvasElement,
  state: GameState,
  now: number,
  you: CourtSquad,
  opp: CourtSquad,
  intro: boolean,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW < 10 || cssH < 10) return;
  if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cam: Camera3D = { along: state.camY, lane: state.camX };

  // Landscape sky
  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, "#7dd3fc");
  sky.addColorStop(0.45, "#bae6fd");
  sky.addColorStop(1, "#334155");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);

  // Far crowd billboard
  if (crowdReady && crowdStrip) {
    const far = projectCourt(48, state.camY, cam, cssW, cssH, 8);
    if (far) {
      const ch = Math.max(70, far.scale * 14);
      const cw = cssW * 1.15;
      ctx.globalAlpha = 0.88;
      ctx.drawImage(crowdStrip, far.x - cw / 2, far.y - ch * 0.85, cw, ch);
      ctx.globalAlpha = 1;
    }
  }

  // Ground apron
  const apron = projectGroundPoly(
    [
      [-8, -10],
      [W + 8, -10],
      [W + 8, H + 10],
      [-8, H + 10],
    ],
    cam,
    cssW,
    cssH,
  );
  if (apron) {
    ctx.fillStyle = "#3f3f46";
    fillProjectedPoly(ctx, apron);
  }

  // Court slab
  const slab = projectGroundPoly(
    [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ],
    cam,
    cssW,
    cssH,
  );
  if (slab) {
    if (woodReady && woodTile) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(slab[0]!.x, slab[0]!.y);
      for (let i = 1; i < slab.length; i++) ctx.lineTo(slab[i]!.x, slab[i]!.y);
      ctx.closePath();
      ctx.clip();
      const pattern = ctx.createPattern(woodTile, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, cssW, cssH);
      }
      ctx.fillStyle = "rgba(194, 92, 28, 0.35)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    } else {
      ctx.fillStyle = "#c2410c";
      fillProjectedPoly(ctx, slab);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 2.5;
    strokeProjectedPoly(ctx, slab);
  }

  // Center line
  const midA = projectCourt(0, H / 2, cam, cssW, cssH);
  const midB = projectCourt(W, H / 2, cam, cssW, cssH);
  if (midA && midB) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    strokeProjectedLine(ctx, midA, midB);
  }

  // Center circle (approx as projected ellipse via samples)
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= 40; i++) {
    const ang = (i / 40) * Math.PI * 2;
    const p = projectCourt(
      25 + Math.cos(ang) * 6,
      H / 2 + Math.sin(ang) * 6,
      cam,
      cssW,
      cssH,
    );
    if (!p) continue;
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();

  // Keys
  const keyPolys: Array<Array<[number, number]>> = [
    [
      [16, 0],
      [34, 0],
      [34, 19],
      [16, 19],
    ],
    [
      [16, H - 19],
      [34, H - 19],
      [34, H],
      [16, H],
    ],
  ];
  for (const corners of keyPolys) {
    const poly = projectGroundPoly(corners, cam, cssW, cssH);
    if (!poly) continue;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    fillProjectedPoly(ctx, poly);
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 2;
    strokeProjectedPoly(ctx, poly);
  }

  // 3pt arcs (sampled)
  for (const [cy, flip] of [
    [4, 1],
    [H - 4, -1],
  ] as const) {
    ctx.beginPath();
    let on = false;
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const ang = flip > 0 ? Math.PI * 0.12 + t * (Math.PI - 0.24) : Math.PI + 0.12 + t * (Math.PI - 0.24);
      const p = projectCourt(25 + Math.cos(ang) * 16, cy + Math.sin(ang) * 16, cam, cssW, cssH);
      if (!p) continue;
      if (!on) {
        ctx.moveTo(p.x, p.y);
        on = true;
      } else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Shot clock on paint
  const offense = possessionSide(state);
  if (offense && !intro && !state.over) {
    const atTop = offense === "you";
    const clockPt = projectCourt(25, atTop ? 9 : H - 9, cam, cssW, cssH, 0.2);
    if (clockPt) {
      const sec = Math.ceil(Math.max(0, state.shotClock - 1e-6));
      const urgent = sec <= 6;
      ctx.save();
      ctx.globalAlpha = urgent ? 0.95 : 0.4;
      ctx.fillStyle = urgent ? "#ef4444" : "#f8fafc";
      ctx.font = `bold ${Math.max(22, Math.round(clockPt.scale * 3.2))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(sec), clockPt.x, clockPt.y);
      ctx.restore();
    }
  }

  const hoopPulse =
    state.ball.inAir && state.ball.targetBasket
      ? 1 + Math.sin(now / 80) * 0.12
      : 1;
  drawHoop3D(
    ctx,
    cam,
    cssW,
    cssH,
    4,
    1,
    state.ball.targetBasket === "opp" && state.ball.inAir,
    hoopPulse,
  );
  drawHoop3D(
    ctx,
    cam,
    cssW,
    cssH,
    H - 4,
    -1,
    state.ball.targetBasket === "you" && state.ball.inAir,
    hoopPulse,
  );

  if (intro) {
    for (let i = 0; i < 4; i++) {
      const ay = 48 - i * 8;
      const ap = projectCourt(25, ay, cam, cssW, cssH, 0.5);
      if (!ap) continue;
      ctx.globalAlpha = 0.35 + i * 0.14;
      ctx.fillStyle = i % 2 === 0 ? "#fb923c" : "#fdba74";
      ctx.beginPath();
      ctx.moveTo(ap.x, ap.y - 1.2 * ap.scale);
      ctx.lineTo(ap.x - 1.4 * ap.scale, ap.y + 0.8 * ap.scale);
      ctx.lineTo(ap.x + 1.4 * ap.scale, ap.y + 0.8 * ap.scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const youBadge = projectCourt(10, 70, cam, cssW, cssH, 0.4);
    const oppBadge = projectCourt(40, 24, cam, cssW, cssH, 0.4);
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    if (youBadge) {
      ctx.fillStyle = "#ffedd5";
      ctx.fillText(`${you.year} ${you.team.abbreviation}`, youBadge.x, youBadge.y);
    }
    if (oppBadge) {
      ctx.fillStyle = "#dbeafe";
      ctx.fillText(`${opp.year} ${opp.team.abbreviation}`, oppBadge.x, oppBadge.y);
    }
  }

  // Depth-sort players + ball for true 3D occlusion
  type DrawItem =
    | { kind: "actor"; a: Actor; p: NonNullable<ReturnType<typeof projectCourt>> }
    | { kind: "ball"; p: NonNullable<ReturnType<typeof projectCourt>>; r: number; spin: number };

  const items: DrawItem[] = [];
  for (const a of state.actors) {
    const p = projectCourt(a.x, a.y, cam, cssW, cssH, 0);
    if (!p) continue;
    if (p.x < -80 || p.x > cssW + 80 || p.y < -80 || p.y > cssH + 120) continue;
    items.push({ kind: "actor", a, p });
  }
  {
    const ballH = state.ball.inAir ? 3.4 : state.ball.loose ? 0.9 : 1.1;
    const p = projectCourt(state.ball.x, state.ball.y, cam, cssW, cssH, ballH);
    if (p) {
      const ballScale = state.ball.inAir ? 1.18 : state.ball.loose ? 1.1 : 1;
      items.push({
        kind: "ball",
        p,
        r: BALL_R * p.scale * 0.55 * ballScale,
        spin: state.ball.inAir || state.ball.loose ? now / 140 : now / 400,
      });
    }
  }
  items.sort((a, b) => b.p.depth - a.p.depth);

  for (const item of items) {
    if (item.kind === "ball") {
      drawBasketball(ctx, item.p.x, item.p.y, item.r, item.spin);
      continue;
    }
    const { a, p } = item;
    const youSide = a.side === "you";
    const speed = Math.hypot(a.vx, a.vy);
    const releasing =
      (state.meter.active && state.ball.ownerId === a.id) ||
      (state.ball.inAir && state.ball.shooterId === a.id) ||
      (now < state.meter.holdUntil && state.ball.shooterId === a.id);
    const pose: SpritePose = releasing ? "shoot" : speed > 2.2 ? "run" : "idle";
    drawCourtCallSprite(ctx, {
      x: p.x,
      y: p.y,
      scale: p.scale * 0.9,
      dna: a.dna,
      jersey: youSide ? "#f59e0b" : "#f8fafc",
      jerseyDark: youSide ? "#b45309" : "#cbd5e1",
      shorts: youSide ? "#1e3a8a" : "#e2e8f0",
      faceX: a.faceX,
      faceY: a.faceY,
      vx: a.vx,
      vy: a.vy,
      now,
      controlled: a.id === state.controlId,
      lastName: a.lastName,
      labelColor: youSide ? "#ffedd5" : "#f8fafc",
      phaseOffset: a.dna.seed * 0.0017,
      pose,
      faceLive: a.faceLive,
      volumetric: true,
    });
  }

  for (const fx of state.fx) {
    const sp = projectCourt(fx.x, fx.y, cam, cssW, cssH, fx.text ? 2.5 : 1);
    if (!sp) continue;
    const alpha = clamp(fx.life / fx.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    if (fx.text) {
      ctx.font = `bold ${Math.max(14, Math.round(sp.scale * 2.2))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = fx.color;
      ctx.fillText(fx.text, sp.x, sp.y);
    } else {
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, fx.size * sp.scale * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (now < state.scorePulseUntil) {
    const t = (state.scorePulseUntil - now) / 900;
    ctx.globalAlpha = clamp(t, 0, 0.75);
    ctx.fillStyle =
      state.lastScorer === "you"
        ? "rgba(249,115,22,0.35)"
        : "rgba(59,130,246,0.35)";
    ctx.fillRect(0, cssH * 0.35, cssW, cssH * 0.2);
    ctx.globalAlpha = 1;
  }
}
