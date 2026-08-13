"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canPlaySlot,
  playerPower,
  UNDEFEATED_RESULT_KEY,
  type CourtPos,
  type LineupPlayer,
} from "@/lib/season";

type TeamOpt = {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  spinWeight: number;
  champion?: boolean;
};

type RosterOption = { year: number; team: TeamOpt };

type SlotKey = number | "sixth";

const SLOTS: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];
/** First spin + one respin per draft pick (resets after you add a player). */
const MAX_SPINS_PER_PICK = 2;

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

function pushRecentYear(list: number[], value: number, max: number) {
  return [value, ...list.filter((x) => x !== value)].slice(0, max);
}

function slotPlayer(
  starters: (LineupPlayer | null)[],
  sixth: LineupPlayer | null,
  slot: SlotKey,
): LineupPlayer | null {
  return slot === "sixth" ? sixth : starters[slot];
}

function isSlotEligibleForPlayer(player: LineupPlayer, slot: SlotKey): boolean {
  if (slot === "sixth") return true;
  return canPlaySlot(player, SLOTS[slot]!);
}

function slotLabel(slot: SlotKey): string {
  return slot === "sixth" ? "6TH" : SLOTS[slot]!;
}

export default function UndefeatedGame() {
  const router = useRouter();
  const [statsPref, setStatsPref] = useState<boolean | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [teamsByYear, setTeamsByYear] = useState<Record<number, TeamOpt[]>>({});
  const [rosterPool, setRosterPool] = useState<RosterOption[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamOpt | null>(null);
  const [spinning, setSpinning] = useState<"year" | "team" | null>(null);
  const [players, setPlayers] = useState<LineupPlayer[]>([]);
  const [starters, setStarters] = useState<(LineupPlayer | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [sixth, setSixth] = useState<LineupPlayer | null>(null);
  const [pendingPlayer, setPendingPlayer] = useState<LineupPlayer | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearSpins, setYearSpins] = useState(0);
  const [teamSpins, setTeamSpins] = useState(0);
  const recentYears = useRef<number[]>([]);
  const recentRosters = useRef<string[]>([]);
  const recentFranchises = useRef<string[]>([]);

  const showStats = statsPref === true;
  const canSpinYear =
    !!years.length && !spinning && yearSpins < MAX_SPINS_PER_PICK;
  const canSpinTeam =
    year != null && !spinning && teamSpins < MAX_SPINS_PER_PICK;

  useEffect(() => {
    fetch("/api/undefeated/meta")
      .then((r) => r.json())
      .then((data) => {
        setYears(data.years);
        setTeamsByYear(data.teamsByYear);
        setRosterPool(data.rosterPool ?? []);
      })
      .catch(() => setError("Could not load seasons."));
  }, []);

  const loadPlayers = useCallback(async (y: number, t: TeamOpt) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/undefeated/players?year=${y}&teamId=${t.id}`,
      );
      const data = await res.json();
      setPlayers(data.players ?? []);
    } catch {
      setError("Failed to load roster.");
    } finally {
      setBusy(false);
    }
  }, []);

  const spinYear = () => {
    if (spinning || !years.length) return;
    if (yearSpins >= MAX_SPINS_PER_PICK) {
      setError("No year respins left — pick a player or use your team spin.");
      return;
    }

    // Respin keeps the current franchise; only the first year spin clears team.
    const keptTeam = team;

    // Prefer years where the kept team has a roster so players still load.
    let yearSource = years;
    if (keptTeam) {
      const teamYears = [
        ...new Set(
          rosterPool
            .filter((r) => r.team.id === keptTeam.id)
            .map((r) => r.year)
            .filter((y) => y !== year),
        ),
      ];
      const freshTeamYears = teamYears.filter(
        (y) => !recentYears.current.includes(y),
      );
      if (freshTeamYears.length >= 1) yearSource = freshTeamYears;
      else if (teamYears.length >= 1) yearSource = teamYears;
      else {
        setError(
          "This franchise has no other years — respin team or pick a player.",
        );
        return;
      }
    } else {
      const yearCandidates = years.filter(
        (y) => !recentYears.current.includes(y),
      );
      yearSource = yearCandidates.length >= 3 ? yearCandidates : years;
    }

    setSpinning("year");
    setYearSpins((n) => n + 1);
    setPlayers([]);
    setPendingPlayer(null);
    setError(null);
    if (!keptTeam) setTeam(null);

    let ticks = 0;
    const id = setInterval(() => {
      const y = yearSource[Math.floor(cryptoRandom() * yearSource.length)]!;
      setYear(y);
      ticks += 1;
      if (ticks > 14) {
        clearInterval(id);
        recentYears.current = pushRecentYear(recentYears.current, y, 14);
        setSpinning(null);

        if (keptTeam) {
          const match = rosterPool.find(
            (r) => r.year === y && r.team.id === keptTeam.id,
          );
          if (match) {
            setTeam(match.team);
            recentRosters.current = pushRecent(
              recentRosters.current,
              rosterKey(y, match.team.id),
              22,
            );
            recentFranchises.current = pushRecent(
              recentFranchises.current,
              match.team.id,
              10,
            );
            void loadPlayers(y, match.team);
          } else {
            setError("Could not load that franchise for the new year.");
            setTeam(keptTeam);
          }
        }
      }
    }, 55);
  };

  const spinTeam = () => {
    if (spinning) return;
    if (year == null) {
      setError("Spin a year first.");
      return;
    }
    if (teamSpins >= MAX_SPINS_PER_PICK) {
      setError(
        "No team respins left — pick from this roster or you're stuck with it.",
      );
      return;
    }

    const lockedYear = year;
    const keptTeam = team;

    // Always keep the spun year; only the team changes.
    let pool = rosterPool.filter((r) => r.year === lockedYear);
    if (keptTeam) {
      const others = pool.filter((r) => r.team.id !== keptTeam.id);
      if (!others.length) {
        setError(
          "No other teams in this year — respin year or pick a player.",
        );
        return;
      }
      pool = others;
    }
    if (!pool.length) {
      setError("No teams available for that year.");
      return;
    }

    const notRecentRoster = pool.filter(
      (r) => !recentRosters.current.includes(rosterKey(r.year, r.team.id)),
    );
    const notRecentFranchise = notRecentRoster.filter(
      (r) => !recentFranchises.current.includes(r.team.id),
    );
    const source =
      notRecentFranchise.length >= 2
        ? notRecentFranchise
        : notRecentRoster.length >= 1
          ? notRecentRoster
          : pool;

    const pickWeight = (r: RosterOption) => {
      let w = r.team.spinWeight ?? 1;
      if (recentRosters.current.includes(rosterKey(r.year, r.team.id))) {
        w *= 0.05;
      } else if (recentFranchises.current.includes(r.team.id)) {
        w *= 0.2;
      }
      return w;
    };

    setSpinning("team");
    setTeamSpins((n) => n + 1);
    setPlayers([]);
    setPendingPlayer(null);
    setError(null);
    let ticks = 0;
    let last = source[0]!;
    const id = setInterval(() => {
      last = weightedPick(source, pickWeight);
      setTeam(last.team);
      ticks += 1;
      if (ticks > 14) {
        clearInterval(id);
        setYear(lockedYear);
        setTeam(last.team);
        recentRosters.current = pushRecent(
          recentRosters.current,
          rosterKey(lockedYear, last.team.id),
          22,
        );
        recentFranchises.current = pushRecent(
          recentFranchises.current,
          last.team.id,
          10,
        );
        setSpinning(null);
        void loadPlayers(lockedYear, last.team);
      }
    }, 55);
  };

  const rosterPlayers = useMemo(() => {
    return [sixth, ...starters].filter(Boolean) as LineupPlayer[];
  }, [starters, sixth]);

  const firstEmptySlot = useMemo((): SlotKey | null => {
    const emptyStarter = starters.findIndex((p) => !p);
    if (emptyStarter >= 0) return emptyStarter;
    if (!sixth) return "sixth";
    return null;
  }, [starters, sixth]);

  const selectedNames = useMemo(
    () => new Set(rosterPlayers.map((p) => p.playerName)),
    [rosterPlayers],
  );

  const usedByName = useMemo(() => {
    const map = new Map<string, SlotKey>();
    starters.forEach((p, i) => {
      if (p) map.set(p.playerName, i);
    });
    if (sixth) map.set(sixth.playerName, "sixth");
    return map;
  }, [starters, sixth]);

  const samePlayer = (a: LineupPlayer, b: LineupPlayer) =>
    a.id === b.id || a.playerName === b.playerName;

  const slotHoldingPlayer = (player: LineupPlayer): SlotKey | null => {
    const starterIdx = starters.findIndex((p) => p && samePlayer(p, player));
    if (starterIdx >= 0) return starterIdx;
    if (sixth && samePlayer(sixth, player)) return "sixth";
    return null;
  };

  const writeSlot = (
    startersArr: (LineupPlayer | null)[],
    sixthP: LineupPlayer | null,
    slot: SlotKey,
    player: LineupPlayer | null,
  ): { starters: (LineupPlayer | null)[]; sixth: LineupPlayer | null } => {
    if (slot === "sixth") return { starters: startersArr, sixth: player };
    const next = [...startersArr];
    next[slot] = player;
    return { starters: next, sixth: sixthP };
  };

  const rosterList = useMemo(() => {
    return [...players].sort((a, b) =>
      a.playerName.localeCompare(b.playerName),
    );
  }, [players]);

  const commitNewPick = () => {
    setPlayers([]);
    setYearSpins(0);
    setTeamSpins(0);
    setYear(null);
    setTeam(null);
  };

  const selectPlayer = (player: LineupPlayer) => {
    setPendingPlayer((cur) =>
      cur && samePlayer(cur, player) ? null : player,
    );
    setError(null);
  };

  const onSlotClick = (slot: SlotKey) => {
    const current = slotPlayer(starters, sixth, slot);
    setError(null);

    if (pendingPlayer) {
      const fromSlot = slotHoldingPlayer(pendingPlayer);
      const sittingHere =
        current &&
        (fromSlot === slot || samePlayer(current, pendingPlayer));

      if (sittingHere) {
        const next = writeSlot(starters, sixth, slot, null);
        setStarters(next.starters);
        setSixth(next.sixth);
        setPendingPlayer(null);
        return;
      }

      if (!isSlotEligibleForPlayer(pendingPlayer, slot)) {
        setError(`Can't play ${pendingPlayer.playerName} at that spot.`);
        return;
      }

      if (fromSlot != null) {
        if (current && !isSlotEligibleForPlayer(current, fromSlot)) {
          setError("That swap isn't eligible for both players' positions.");
          return;
        }
        let next = writeSlot(starters, sixth, fromSlot, current);
        next = writeSlot(next.starters, next.sixth, slot, pendingPlayer);
        setStarters(next.starters);
        setSixth(next.sixth);
        setPendingPlayer(null);
        return;
      }

      if (
        selectedNames.has(pendingPlayer.playerName) &&
        fromSlot == null
      ) {
        setError("That player is already on your squad.");
        return;
      }

      const next = writeSlot(starters, sixth, slot, pendingPlayer);
      setStarters(next.starters);
      setSixth(next.sixth);
      setPendingPlayer(null);
      commitNewPick();
      return;
    }

    if (current) {
      setPendingPlayer(current);
    }
  };

  const canSimulate = starters.every(Boolean);

  const runSeason = async () => {
    if (!canSimulate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/undefeated/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starters,
          sixthMan: sixth,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Simulation failed");
        return;
      }
      sessionStorage.setItem(
        UNDEFEATED_RESULT_KEY,
        JSON.stringify({
          result: data,
          starters,
          sixthMan: sixth,
        }),
      );
      router.push("/undefeated/results");
    } catch {
      setError("Simulation failed");
    } finally {
      setBusy(false);
    }
  };

  if (statsPref === null) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 safe-bottom">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
          >
            ← SwishIt
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)]">
            Undefeated
          </h1>
          <span className="w-14" />
        </div>

        <div className="animate-rise mt-10 flex items-stretch gap-2 sm:gap-3">
          <div className="flex w-[4.5rem] shrink-0 flex-col pt-3 sm:w-24 sm:pt-4">
            {/* spacer so labels align with the button box under Statistics? */}
            <div className="mb-4 h-12 sm:mb-5 sm:h-14" aria-hidden />
            <div className="flex flex-1 items-center justify-center">
              <p className="-rotate-[8deg] font-[family-name:var(--font-display)] text-2xl tracking-wide text-emerald-400 sm:text-3xl">
                Easy
              </p>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <p className="-rotate-[8deg] text-center font-[family-name:var(--font-display)] text-lg leading-none tracking-wide sm:text-xl">
                <span className="block bg-gradient-to-r from-red-500 via-orange-500 to-orange-400 bg-clip-text text-transparent">
                  Ball
                </span>
                <span className="mt-0.5 block bg-gradient-to-r from-red-500 via-orange-500 to-orange-400 bg-clip-text text-transparent">
                  Knowledge
                </span>
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <p className="mb-4 text-center font-[family-name:var(--font-display)] text-5xl tracking-wide sm:mb-5 sm:text-6xl">
              <span className="bg-gradient-to-r from-orange-100 via-orange-300 to-orange-400 bg-clip-text text-transparent">
                Statistics?
              </span>
            </p>
            <section className="flex flex-1 flex-col gap-3 rounded-2xl border border-[var(--line)] bg-black/30 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setStatsPref(true)}
                className="flex flex-1 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--tile)] py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-[var(--ink)]"
              >
                Turn statistics on
              </button>
              <button
                type="button"
                onClick={() => setStatsPref(false)}
                className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--orange)] py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-black"
              >
                Play without stats
              </button>
            </section>
          </div>
        </div>
      </main>
    );
  }

  const highlightSlot = pendingPlayer
    ? slotHoldingPlayer(pendingPlayer)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 safe-bottom">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          ← SwishIt
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--orange-hot)]">
          Undefeated
        </h1>
        <button
          type="button"
          onClick={() => setStatsPref((v) => !v)}
          className="text-[10px] font-bold uppercase tracking-wider text-[var(--orange-hot)]"
        >
          Stats {showStats ? "on" : "off"}
        </button>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-black/25 p-4">
        <div className="flex items-center justify-center gap-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            tap/click to spin.
          </p>
          <p className="font-[family-name:var(--font-body)] text-[13px] font-medium tracking-wide text-[var(--ink)]">
            Respins left — Year{" "}
            <span
              className={
                yearSpins >= 2
                  ? "text-[15px] font-semibold text-red-400"
                  : "text-[15px] font-semibold text-emerald-400"
              }
            >
              {yearSpins >= 2 ? 0 : 1}
            </span>
            {"  "}
            Team{" "}
            <span
              className={
                teamSpins >= 2
                  ? "text-[15px] font-semibold text-red-400"
                  : "text-[15px] font-semibold text-emerald-400"
              }
            >
              {teamSpins >= 2 ? 0 : 1}
            </span>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={spinYear}
            disabled={!canSpinYear}
            className="rounded-xl border border-[var(--line)] bg-[var(--tile)] px-3 py-4 text-left active:scale-[0.98] disabled:opacity-40"
          >
            <span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">
              Year
            </span>
            <span
              className={`mt-1 block font-[family-name:var(--font-display)] text-4xl ${spinning === "year" ? "text-[var(--orange)]" : ""}`}
            >
              {year ?? "----"}
            </span>
          </button>
          <button
            type="button"
            onClick={spinTeam}
            disabled={!canSpinTeam}
            className="rounded-xl border border-[var(--line)] bg-[var(--tile)] px-3 py-4 text-left active:scale-[0.98] disabled:opacity-40"
          >
            <span className="block text-[10px] uppercase tracking-widest text-[var(--muted)]">
              Team
            </span>
            <span className="mt-1 block font-[family-name:var(--font-display)] text-3xl leading-none">
              {team ? team.abbreviation : "----"}
            </span>
            <span className="mt-1 block truncate text-xs text-[var(--muted)]">
              {team ? `${team.city} ${team.name}` : "Spin after year"}
            </span>
          </button>
        </div>
      </section>

      <section className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          {pendingPlayer
            ? slotHoldingPlayer(pendingPlayer) != null
              ? `Move ${pendingPlayer.playerName}: lit = eligible place or swap. Tap their spot to remove.`
              : `Place ${pendingPlayer.playerName}: tap a lit position`
            : "Tap a player, then a lit position"}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SLOTS.map((pos, i) => {
            const p = starters[i];
            const isPendingSource = highlightSlot === i;
            const litTarget =
              !!pendingPlayer &&
              !isPendingSource &&
              isSlotEligibleForPlayer(pendingPlayer, i);
            return (
              <button
                key={pos}
                type="button"
                onClick={() => onSlotClick(i)}
                className={`min-h-[4.5rem] rounded-xl border px-2 py-2 text-left transition ${
                  isPendingSource
                    ? "border-[var(--orange)] bg-[var(--orange)]/30 ring-2 ring-[var(--orange)]"
                    : litTarget
                      ? "border-[var(--orange)]/70 bg-[var(--orange)]/15 ring-2 ring-[var(--orange)]"
                      : "border-[var(--line)] bg-[var(--tile)]"
                }`}
              >
                <span className="text-[10px] font-bold text-[var(--orange-hot)]">
                  {pos}
                </span>
                <span className="mt-1 block text-xs leading-snug">
                  {p ? p.playerName : "Empty"}
                </span>
                {p && showStats && (
                  <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                    {p.ppg.toFixed(1)}/{p.rpg.toFixed(1)}/{p.apg.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSlotClick("sixth")}
            className={`min-h-[4.5rem] rounded-xl border px-2 py-2 text-left transition ${
              highlightSlot === "sixth"
                ? "border-[var(--orange)] bg-[var(--orange)]/30 ring-2 ring-[var(--orange)]"
                : pendingPlayer && highlightSlot !== "sixth"
                  ? "border-[var(--orange)]/70 bg-[var(--orange)]/15 ring-2 ring-[var(--orange)]"
                  : "border-[var(--line)] bg-[var(--tile)]"
            }`}
          >
            <span className="text-[10px] font-bold text-[var(--orange-hot)]">
              6TH
            </span>
            <span className="mt-1 block text-xs leading-snug">
              {sixth ? sixth.playerName : "Empty"}
            </span>
          </button>
        </div>
      </section>

      {team && players.length > 0 && (
        <section className="mt-4 flex-1 rounded-2xl border border-[var(--line)] bg-black/25 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {year} {team.abbreviation} roster
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              {pendingPlayer
                ? `Selected: ${pendingPlayer.playerName}`
                : "Tap a player to select"}
            </p>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {rosterList.map((p) => {
              const usedOn = usedByName.get(p.playerName);
              const selected =
                !!pendingPlayer && samePlayer(pendingPlayer, p);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPlayer(p)}
                    className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                      selected
                        ? "border-[var(--orange)] bg-[var(--tile-selected)]"
                        : usedOn != null
                          ? "border-[var(--line)] bg-black/20"
                          : "border-transparent hover:border-[var(--line)] hover:bg-[var(--tile)]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {p.playerName}
                        {usedOn != null ? (
                          <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[var(--orange-hot)]">
                            → {slotLabel(usedOn)}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {p.positions.join("/")}
                        {showStats && (
                          <>
                            {" "}
                            · {p.ppg.toFixed(1)} pts · {p.rpg.toFixed(1)} reb ·{" "}
                            {p.apg.toFixed(1)} ast · impact{" "}
                            {Math.round(playerPower(p))}
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {!rosterList.length && !busy && (
              <li className="text-sm text-[var(--muted)]">
                No names left in this pool — spin again.
              </li>
            )}
          </ul>
        </section>
      )}

      {players.length === 0 &&
        !busy &&
        !spinning &&
        firstEmptySlot != null &&
        rosterPlayers.length > 0 && (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Spin again for the next pick — 1 year respin and 1 team respin each.
          </p>
        )}

      {error && (
        <p className="mt-3 text-sm text-[var(--bad)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!canSimulate || busy}
        onClick={runSeason}
        className="mt-4 w-full rounded-2xl bg-[var(--orange)] py-3.5 text-center text-sm font-bold uppercase tracking-[0.18em] text-black disabled:opacity-40"
      >
        {busy ? "Working…" : "Run the season"}
      </button>
    </main>
  );
}
