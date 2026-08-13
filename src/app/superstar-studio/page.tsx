"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LineupPlayer } from "@/lib/season";
import {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  SUPERSTAR_RESULT_KEY,
  scoreAttribute,
  simulateSuperstarCareer,
  type AttributeKey,
} from "@/lib/superstar";

const TEAM_COUNT = 6;

type TeamOpt = {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  spinWeight: number;
};

type RosterOption = { year: number; team: TeamOpt };

type SpunSlot = {
  id: string;
  year: number;
  team: TeamOpt;
};

function cryptoRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 2 ** 32;
}

function weightedPick<T>(items: T[], weightOf: (item: T) => number): T {
  const weights = items.map((item) => Math.max(0.01, weightOf(item)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = cryptoRandom() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

function rosterKey(year: number, teamId: string) {
  return `${year}:${teamId}`;
}

function pushRecent(list: string[], value: string, max: number) {
  return [value, ...list.filter((x) => x !== value)].slice(0, max);
}

export default function SuperstarStudioPage() {
  const router = useRouter();
  const [rosterPool, setRosterPool] = useState<RosterOption[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [slots, setSlots] = useState<SpunSlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [roster, setRoster] = useState<LineupPlayer[]>([]);
  const [busyRoster, setBusyRoster] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState<LineupPlayer | null>(null);
  const [picks, setPicks] = useState<Partial<Record<AttributeKey, LineupPlayer>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  const recentRosters = useRef<string[]>([]);
  const recentFranchises = useRef<string[]>([]);

  useEffect(() => {
    fetch("/api/undefeated/meta")
      .then((r) => r.json())
      .then((data) => {
        const pool = (data.rosterPool ?? []) as RosterOption[];
        setRosterPool(
          pool.filter((r) => r.year >= 1980 && r.year <= 2026),
        );
      })
      .catch(() => setError("Could not load teams."));
  }, []);

  const filledCount = useMemo(
    () => ATTRIBUTES.filter((a) => picks[a]).length,
    [picks],
  );
  const allFilled = filledCount === ATTRIBUTES.length;

  const loadRoster = useCallback(async (slot: SpunSlot) => {
    setBusyRoster(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/undefeated/players?year=${slot.year}&teamId=${slot.team.id}`,
      );
      const data = await res.json();
      setRoster(data.players ?? []);
    } catch {
      setError("Failed to load that roster.");
      setRoster([]);
    } finally {
      setBusyRoster(false);
    }
  }, []);

  const openSlot = (slot: SpunSlot) => {
    setActiveSlotId(slot.id);
    void loadRoster(slot);
  };

  const spinTeams = () => {
    if (spinning || hasSpun || rosterPool.length < TEAM_COUNT) {
      if (hasSpun) setError("Teams are locked — no respins.");
      else if (rosterPool.length < TEAM_COUNT) {
        setError("Not enough teams in the pool yet.");
      }
      return;
    }

    setSpinning(true);
    setError(null);
    setActiveSlotId(null);
    setRoster([]);
    setPicks({});
    setPendingPlayer(null);

    let ticks = 0;
    let preview: SpunSlot[] = [];
    const id = setInterval(() => {
      const batch: SpunSlot[] = [];
      const usedKeys = new Set<string>();
      const usedFranchises = new Set<string>();

      for (let i = 0; i < TEAM_COUNT; i++) {
        let pool = rosterPool.filter((r) => {
          const key = rosterKey(r.year, r.team.id);
          if (usedKeys.has(key)) return false;
          if (usedFranchises.has(r.team.id)) return false;
          return true;
        });
        if (pool.length < 4) {
          pool = rosterPool.filter(
            (r) => !usedKeys.has(rosterKey(r.year, r.team.id)),
          );
        }
        if (!pool.length) pool = rosterPool;

        const notRecentRoster = pool.filter(
          (r) =>
            !recentRosters.current.includes(rosterKey(r.year, r.team.id)),
        );
        const notRecentFranchise = notRecentRoster.filter(
          (r) => !recentFranchises.current.includes(r.team.id),
        );
        const source =
          notRecentFranchise.length >= 6
            ? notRecentFranchise
            : notRecentRoster.length >= 3
              ? notRecentRoster
              : pool;

        const pick = weightedPick(source, (r) => {
          let w = r.team.spinWeight ?? 1;
          if (
            recentRosters.current.includes(rosterKey(r.year, r.team.id))
          ) {
            w *= 0.05;
          } else if (recentFranchises.current.includes(r.team.id)) {
            w *= 0.2;
          }
          return w;
        });

        usedKeys.add(rosterKey(pick.year, pick.team.id));
        usedFranchises.add(pick.team.id);
        batch.push({
          id: `${pick.year}-${pick.team.id}-${i}-${ticks}`,
          year: pick.year,
          team: pick.team,
        });
      }

      preview = batch;
      setSlots(batch);
      ticks += 1;

      if (ticks > 14) {
        clearInterval(id);
        for (const s of preview) {
          recentRosters.current = pushRecent(
            recentRosters.current,
            rosterKey(s.year, s.team.id),
            22,
          );
          recentFranchises.current = pushRecent(
            recentFranchises.current,
            s.team.id,
            10,
          );
        }
        setSpinning(false);
        setHasSpun(true);
      }
    }, 55);
  };

  const selectPlayer = (player: LineupPlayer) => {
    setPendingPlayer((cur) =>
      cur && (cur.id === player.id || cur.playerName === player.playerName)
        ? null
        : player,
    );
    setError(null);
  };

  const attrHoldingPlayer = (player: LineupPlayer) =>
    ATTRIBUTES.find((a) => {
      const pl = picks[a];
      return (
        !!pl &&
        (pl.id === player.id || pl.playerName === player.playerName)
      );
    }) ?? null;

  const moveOrSwapPending = (attr: AttributeKey) => {
    if (!pendingPlayer) return;
    const player = pendingPlayer;
    const fromAttr = attrHoldingPlayer(player);

    setPicks((prev) => {
      const next = { ...prev };
      // Drop this player from any current trait first.
      for (const key of ATTRIBUTES) {
        const existing = next[key];
        if (
          existing &&
          (existing.id === player.id ||
            existing.playerName === player.playerName)
        ) {
          delete next[key];
        }
      }

      const target = prev[attr];
      const targetIsOther =
        target &&
        target.playerName !== player.playerName &&
        target.id !== player.id;

      if (fromAttr != null && targetIsOther && fromAttr !== attr) {
        // Swap with the player already on this trait.
        next[fromAttr] = target;
        next[attr] = player;
      } else {
        // Move into empty trait, or replace from roster pick.
        next[attr] = player;
      }
      return next;
    });
    setPendingPlayer(null);
    setError(null);
  };

  const onAttrClick = (attr: AttributeKey) => {
    const occupant = picks[attr] ?? null;

    if (pendingPlayer) {
      const fromAttr = attrHoldingPlayer(pendingPlayer);
      // Tap the box they're already on → clear them off.
      if (
        fromAttr === attr &&
        occupant &&
        (occupant.playerName === pendingPlayer.playerName ||
          occupant.id === pendingPlayer.id)
      ) {
        clearAttr(attr);
        setPendingPlayer(null);
        setError(null);
        return;
      }
      moveOrSwapPending(attr);
      return;
    }

    // No selection yet: tapping a filled box picks that player to move/swap.
    if (occupant) {
      setPendingPlayer(occupant);
      setError(null);
    }
  };

  const clearAttr = (attr: AttributeKey) => {
    setPicks((prev) => {
      const next = { ...prev };
      delete next[attr];
      return next;
    });
  };

  const goSuperstar = () => {
    if (!allFilled) {
      setError(`Fill all ${ATTRIBUTES.length} attributes first.`);
      return;
    }
    const attributePicks = ATTRIBUTES.map((attribute) => {
      const player = picks[attribute]!;
      return {
        attribute,
        player,
        score: scoreAttribute(attribute, player),
      };
    });
    const career = simulateSuperstarCareer(attributePicks);
    sessionStorage.setItem(
      SUPERSTAR_RESULT_KEY,
      JSON.stringify({ career }),
    );
    router.push("/superstar-studio/results");
  };

  const activeSlot = slots.find((s) => s.id === activeSlotId) ?? null;

  const usedByName = useMemo(() => {
    const map = new Map<string, AttributeKey>();
    for (const attr of ATTRIBUTES) {
      const pl = picks[attr];
      if (pl) map.set(pl.playerName, attr);
    }
    return map;
  }, [picks]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6 safe-bottom">
      <div className="relative">
        <Link
          href="/"
          className="absolute left-0 top-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          ← SwishIt
        </Link>
        <h1 className="text-center font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--orange-hot)] sm:text-5xl">
          SUPERSTAR STUDIO
        </h1>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={spinTeams}
            disabled={spinning || hasSpun || rosterPool.length < TEAM_COUNT}
            className="w-full rounded-xl bg-[var(--orange)] py-3 text-sm font-bold uppercase tracking-[0.16em] text-black disabled:opacity-40"
          >
            {spinning ? "Spinning…" : hasSpun ? "Teams locked" : "Spin Teams"}
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {slots.length === 0 &&
              Array.from({ length: TEAM_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-dashed border-[var(--line)] px-2 py-3 text-center text-xs text-[var(--muted)]"
                >
                  — —
                </div>
              ))}
            {slots.map((slot) => {
              const selected = activeSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => openSlot(slot)}
                  disabled={spinning}
                  className={`rounded-xl border px-2 py-2.5 text-left transition active:scale-[0.98] ${
                    selected
                      ? "border-[var(--orange)] bg-[var(--tile-selected)]"
                      : "border-[var(--line)] bg-[var(--tile)]"
                  }`}
                >
                  <span className="block font-[family-name:var(--font-display)] text-xl leading-none tracking-wide">
                    {slot.team.abbreviation}
                  </span>
                  <span className="mt-1 block text-[11px] text-[var(--muted)]">
                    {slot.year} · {slot.team.city}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Person figure with attributes */}
        <div className="w-[138px] shrink-0">
          <div className="relative mx-auto flex flex-col items-center rounded-[2.5rem] border border-[var(--line)] bg-gradient-to-b from-[#2a1a10] to-[#120d09] px-2 pb-3 pt-3 shadow-[inset_0_0_30px_rgba(249,115,22,0.12)]">
            <ul className="flex w-full flex-col gap-1">
              {ATTRIBUTES.map((attr) => {
                const player = picks[attr];
                const isPendingSource =
                  !!pendingPlayer &&
                  !!player &&
                  (player.playerName === pendingPlayer.playerName ||
                    player.id === pendingPlayer.id);
                const litTarget = !!pendingPlayer && !isPendingSource;
                return (
                  <li key={attr}>
                    <button
                      type="button"
                      onClick={() => onAttrClick(attr)}
                      className={`w-full rounded-lg px-1.5 py-1 text-left transition ${
                        isPendingSource
                          ? "bg-[var(--orange)]/30 ring-2 ring-[var(--orange)]"
                          : litTarget
                            ? "bg-[var(--orange)]/15 ring-2 ring-[var(--orange)] ring-offset-1 ring-offset-[#1a1008]"
                            : player
                              ? "bg-black/35"
                              : "bg-black/15"
                      }`}
                    >
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        {ATTRIBUTE_LABELS[attr]}
                      </span>
                      <span className="block truncate text-[10px] leading-tight text-[var(--ink)]">
                        {player ? player.playerName : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-2 text-center text-[10px] leading-snug text-[var(--muted)]">
            {pendingPlayer
              ? `Move ${pendingPlayer.playerName}: lit = place or swap. Tap again to remove.`
              : "Tap a player or a filled trait to select"}
          </p>
        </div>
      </div>

      {activeSlot && (
        <section className="mt-5 rounded-2xl border border-[var(--line)] bg-black/25 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {activeSlot.year} {activeSlot.team.city} {activeSlot.team.name}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              {pendingPlayer
                ? `Selected: ${pendingPlayer.playerName}`
                : "Tap a player to select"}
            </p>
          </div>
          {busyRoster ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Loading roster…
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {roster.map((p) => {
                const usedOn = usedByName.get(p.playerName);
                const selected =
                  pendingPlayer?.id === p.id ||
                  pendingPlayer?.playerName === p.playerName;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectPlayer(p)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left active:scale-[0.99] ${
                        selected
                          ? "border-[var(--orange)] bg-[var(--tile-selected)]"
                          : usedOn
                            ? "border-[var(--line)] bg-black/20"
                            : "border-transparent hover:border-[var(--line)] hover:bg-[var(--tile)]"
                      }`}
                    >
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {p.playerName}
                        {usedOn ? (
                          <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[var(--orange-hot)]">
                            → {ATTRIBUTE_LABELS[usedOn]}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                        {p.positions.join("/")}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!roster.length && (
                <p className="py-4 text-center text-sm text-[var(--muted)]">
                  No players on this roster.
                </p>
              )}
            </ul>
          )}
        </section>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-[var(--bad)]">{error}</p>
      )}

      <button
        type="button"
        onClick={goSuperstar}
        disabled={!allFilled}
        className="mt-6 w-full rounded-2xl border border-[var(--orange)]/50 bg-gradient-to-r from-[#3b2112] to-[#1a1008] py-4 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)] disabled:opacity-35"
      >
        Superstar? ({filledCount}/{ATTRIBUTES.length})
      </button>
    </main>
  );
}
