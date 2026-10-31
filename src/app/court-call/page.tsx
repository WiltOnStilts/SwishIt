"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CourtCallGame } from "@/components/court-call-game";
import { HowToButton } from "@/components/how-to-play";
import type { CourtPos, LineupPlayer } from "@/lib/season";
import {
  buildLineup,
  COURT_CALL_STEPS,
  filterRosters,
  rosterLabel,
  type CourtCallMeta,
  type CourtSquad,
  type RosterOption,
  type TeamMeta,
} from "@/lib/court-call";

const SLOTS: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];

async function loadSquad(year: number, team: TeamMeta): Promise<CourtSquad | null> {
  const res = await fetch(
    `/api/undefeated/players?year=${year}&teamId=${encodeURIComponent(team.id)}`,
  );
  const data = (await res.json()) as { players?: LineupPlayer[]; error?: string };
  if (!data.players) return null;
  const lineup = buildLineup(data.players);
  if (!lineup) return null;
  return { year, team, lineup };
}

function pickRandomOther(pool: RosterOption[], avoid: RosterOption): RosterOption {
  const others = pool.filter(
    (r) => !(r.year === avoid.year && r.team.id === avoid.team.id),
  );
  const source = others.length ? others : pool;
  return source[Math.floor(Math.random() * source.length)]!;
}

type SidePick = "you" | "opp";

export default function CourtCallPage() {
  const [meta, setMeta] = useState<CourtCallMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchTarget, setSearchTarget] = useState<SidePick>("you");

  const [youYear, setYouYear] = useState<number | null>(null);
  const [youTeamId, setYouTeamId] = useState<string | null>(null);
  const [oppYear, setOppYear] = useState<number | null>(null);
  const [oppTeamId, setOppTeamId] = useState<string | null>(null);
  const [lockSlot, setLockSlot] = useState<CourtPos>("PG");

  const [starting, setStarting] = useState(false);
  const [match, setMatch] = useState<{
    you: CourtSquad;
    opp: CourtSquad;
    lockSlot: CourtPos;
  } | null>(null);

  useEffect(() => {
    fetch("/api/undefeated/meta")
      .then(async (res) => {
        const data = (await res.json()) as CourtCallMeta & { error?: string };
        if (data.error) throw new Error(data.error);
        setMeta(data);
        const mid = data.years[Math.floor(data.years.length / 2)] ?? data.years[0];
        const youTeams = mid != null ? data.teamsByYear[mid] ?? [] : [];
        setYouYear(mid ?? null);
        setYouTeamId(youTeams[0]?.id ?? null);

        const oppMid =
          data.years[Math.min(data.years.length - 1, Math.floor(data.years.length / 2) + 3)] ??
          mid;
        const oppTeams = oppMid != null ? data.teamsByYear[oppMid] ?? [] : [];
        setOppYear(oppMid ?? null);
        const oppDefault =
          oppTeams.find((t) => t.id !== youTeams[0]?.id) ?? oppTeams[0] ?? null;
        setOppTeamId(oppDefault?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const youTeams = useMemo(() => {
    if (!meta || youYear == null) return [];
    return meta.teamsByYear[youYear] ?? [];
  }, [meta, youYear]);

  const oppTeams = useMemo(() => {
    if (!meta || oppYear == null) return [];
    return meta.teamsByYear[oppYear] ?? [];
  }, [meta, oppYear]);

  const youTeam = youTeams.find((t) => t.id === youTeamId) ?? youTeams[0] ?? null;
  const oppTeam = oppTeams.find((t) => t.id === oppTeamId) ?? oppTeams[0] ?? null;

  useEffect(() => {
    if (youTeam && youTeamId !== youTeam.id) setYouTeamId(youTeam.id);
  }, [youTeam, youTeamId]);

  useEffect(() => {
    if (oppTeam && oppTeamId !== oppTeam.id) setOppTeamId(oppTeam.id);
  }, [oppTeam, oppTeamId]);

  const searchHits = useMemo(() => {
    if (!meta) return [];
    return filterRosters(meta.rosterPool, query).slice(0, 12);
  }, [meta, query]);

  const shiftYear = (side: SidePick, dir: -1 | 1) => {
    if (!meta) return;
    const year = side === "you" ? youYear : oppYear;
    if (year == null) return;
    const idx = meta.years.indexOf(year);
    if (idx < 0) return;
    const next = meta.years[clampIndex(idx + dir, meta.years.length)]!;
    const teams = meta.teamsByYear[next] ?? [];
    const curId = side === "you" ? youTeamId : oppTeamId;
    const keep = teams.find((t) => t.id === curId);
    if (side === "you") {
      setYouYear(next);
      setYouTeamId(keep?.id ?? teams[0]?.id ?? null);
    } else {
      setOppYear(next);
      setOppTeamId(keep?.id ?? teams[0]?.id ?? null);
    }
  };

  const shiftTeam = (side: SidePick, dir: -1 | 1) => {
    const teams = side === "you" ? youTeams : oppTeams;
    const selected = side === "you" ? youTeam : oppTeam;
    if (!teams.length || !selected) return;
    const idx = teams.findIndex((t) => t.id === selected.id);
    const next = teams[clampIndex(idx + dir, teams.length)]!;
    if (side === "you") setYouTeamId(next.id);
    else setOppTeamId(next.id);
  };

  const applySearchHit = (r: RosterOption) => {
    if (searchTarget === "you") {
      setYouYear(r.year);
      setYouTeamId(r.team.id);
    } else {
      setOppYear(r.year);
      setOppTeamId(r.team.id);
    }
    setQuery("");
  };

  const startMatch = async (youOpt: RosterOption, oppOpt: RosterOption, slot: CourtPos) => {
    setStarting(true);
    setError(null);
    try {
      const [you, opp] = await Promise.all([
        loadSquad(youOpt.year, youOpt.team),
        loadSquad(oppOpt.year, oppOpt.team),
      ]);
      if (!you || !opp) {
        setError("Could not build lineups for that matchup.");
        return;
      }
      setMatch({ you, opp, lockSlot: slot });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const tipOffSelected = () => {
    if (youYear == null || !youTeam || oppYear == null || !oppTeam) return;
    void startMatch(
      { year: youYear, team: youTeam },
      { year: oppYear, team: oppTeam },
      lockSlot,
    );
  };

  const tipOffRandom = () => {
    if (!meta?.rosterPool.length) return;
    const youOpt =
      meta.rosterPool[Math.floor(Math.random() * meta.rosterPool.length)]!;
    const oppOpt = pickRandomOther(meta.rosterPool, youOpt);
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)]!;
    setLockSlot(slot);
    void startMatch(youOpt, oppOpt, slot);
  };

  if (match) {
    return (
      <CourtCallGame
        you={match.you}
        opp={match.opp}
        lockSlot={match.lockSlot}
        onExit={() => setMatch(null)}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
        >
          ← Home
        </Link>
        <HowToButton title="Court Call" steps={COURT_CALL_STEPS} />
      </header>

      <h1 className="mt-4 text-center font-[family-name:var(--font-display)] text-5xl tracking-wide text-[var(--orange-hot)]">
        Court Call
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-[var(--muted)]">
        Pick your squad, lock your player, and choose who you&apos;re facing.
      </p>

      {loading ? (
        <p className="mt-10 text-center text-sm text-[var(--muted)]">Loading teams…</p>
      ) : error && !meta ? (
        <p className="mt-10 text-center text-sm text-[var(--bad)]">{error}</p>
      ) : meta ? (
        <>
          <label className="mt-8 block text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Search teams
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 1996 bulls, lakers, spurs"
              className="mt-2 w-full rounded-xl border border-[var(--line)] bg-black/35 px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]/50 focus:border-[var(--orange)]"
            />
          </label>

          <div className="mt-2 flex gap-2">
            {(["you", "opp"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setSearchTarget(side)}
                className={`flex-1 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  searchTarget === side
                    ? "border-[var(--orange)] bg-[var(--orange)]/25 text-[var(--ink)]"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                Apply to {side === "you" ? "your team" : "opponent"}
              </button>
            ))}
          </div>

          {query.trim() ? (
            <ul className="mt-3 max-h-48 overflow-auto rounded-xl border border-[var(--line)] bg-black/30">
              {searchHits.length === 0 ? (
                <li className="px-4 py-3 text-sm text-[var(--muted)]">No matches.</li>
              ) : (
                searchHits.map((r) => (
                  <li key={`${r.year}-${r.team.id}`}>
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--orange)]/15"
                      onClick={() => applySearchHit(r)}
                    >
                      {rosterLabel(r)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          <TeamPicker
            label="Your team"
            accent="you"
            year={youYear}
            team={youTeam}
            onPrevYear={() => shiftYear("you", -1)}
            onNextYear={() => shiftYear("you", 1)}
            onPrevTeam={() => shiftTeam("you", -1)}
            onNextTeam={() => shiftTeam("you", 1)}
          />

          {youTeam && youYear != null ? (
            <PlayerLockPicker
              year={youYear}
              team={youTeam}
              lockSlot={lockSlot}
              onLock={setLockSlot}
            />
          ) : null}

          <TeamPicker
            label="Opponent"
            accent="opp"
            year={oppYear}
            team={oppTeam}
            onPrevYear={() => shiftYear("opp", -1)}
            onNextYear={() => shiftYear("opp", 1)}
            onPrevTeam={() => shiftTeam("opp", -1)}
            onNextTeam={() => shiftTeam("opp", 1)}
          />

          {error ? (
            <p className="mt-4 text-center text-sm text-[var(--bad)]">{error}</p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              disabled={starting || !youTeam || !oppTeam}
              onClick={tipOffSelected}
              className="rounded-2xl border border-[var(--orange)] bg-[var(--orange)]/25 px-4 py-3.5 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--ink)] disabled:opacity-40"
            >
              {starting ? "Loading…" : "Tip off"}
            </button>
            <button
              type="button"
              disabled={starting}
              onClick={tipOffRandom}
              className="rounded-2xl border border-[var(--line)] bg-black/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)] disabled:opacity-40"
            >
              Random matchup
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}

function clampIndex(i: number, len: number) {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

function TeamPicker({
  label,
  accent,
  year,
  team,
  onPrevYear,
  onNextYear,
  onPrevTeam,
  onNextTeam,
}: {
  label: string;
  accent: SidePick;
  year: number | null;
  team: TeamMeta | null;
  onPrevYear: () => void;
  onNextYear: () => void;
  onPrevTeam: () => void;
  onNextTeam: () => void;
}) {
  const yearColor =
    accent === "you" ? "text-[var(--orange-hot)]" : "text-sky-300";
  return (
    <div className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-black/20 px-3 py-4">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={`${label} previous year`}
          onClick={onPrevYear}
          className="h-11 w-11 rounded-full border border-[var(--line)] text-lg text-[var(--ink)]"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Year
          </p>
          <p
            className={`font-[family-name:var(--font-display)] text-4xl tracking-wide ${yearColor}`}
          >
            {year}
          </p>
        </div>
        <button
          type="button"
          aria-label={`${label} next year`}
          onClick={onNextYear}
          className="h-11 w-11 rounded-full border border-[var(--line)] text-lg text-[var(--ink)]"
        >
          ›
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={`${label} previous team`}
          onClick={onPrevTeam}
          className="h-11 w-11 rounded-full border border-[var(--line)] text-lg text-[var(--ink)]"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Team
          </p>
          <p className="truncate font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--ink)]">
            {team ? `${team.city} ${team.name}` : "—"}
          </p>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {team?.abbreviation}
            {team?.champion ? " · champs" : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label={`${label} next team`}
          onClick={onNextTeam}
          className="h-11 w-11 rounded-full border border-[var(--line)] text-lg text-[var(--ink)]"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function PlayerLockPicker({
  year,
  team,
  lockSlot,
  onLock,
}: {
  year: number;
  team: TeamMeta;
  lockSlot: CourtPos;
  onLock: (slot: CourtPos) => void;
}) {
  const [lineup, setLineup] = useState<Record<CourtPos, LineupPlayer> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLineup(null);
    fetch(
      `/api/undefeated/players?year=${year}&teamId=${encodeURIComponent(team.id)}`,
    )
      .then((r) => r.json())
      .then((data: { players?: LineupPlayer[] }) => {
        if (cancelled || !data.players) return;
        setLineup(buildLineup(data.players));
      })
      .catch(() => {
        if (!cancelled) setLineup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [year, team.id]);

  return (
    <div className="mt-4 rounded-2xl border border-[var(--orange)]/40 bg-[var(--orange)]/10 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--orange-hot)]">
        Player lock
      </p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        You stay on this player the whole game — no mid-game switches.
      </p>
      {lineup == null ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Loading roster…</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {SLOTS.map((slot) => {
            const p = lineup[slot];
            const selected = lockSlot === slot;
            return (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => onLock(slot)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "border-[var(--orange)] bg-[var(--orange)]/25 text-[var(--ink)]"
                      : "border-[var(--line)] bg-black/25 text-[var(--ink)] hover:border-[var(--orange)]/50"
                  }`}
                >
                  <span>
                    <span className="font-bold text-[var(--muted)]">{slot}</span>{" "}
                    {p.playerName}
                  </span>
                  {selected ? (
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange-hot)]">
                      Locked
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
