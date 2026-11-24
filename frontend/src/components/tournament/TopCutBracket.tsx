import { Check, ChevronDown, ExternalLink, GitBranch, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TopCutMatch, TopCutRound } from "../../lib/types";
import { countryFlag } from "../../lib/countries";
import { openExternal } from "../../lib/openExternal";

interface Props {
  rounds: TopCutRound[];
  sourceUrl?: string | null;
}

function isFinal(label: string) {
  return /final/i.test(label);
}

function PlayerRow({ player, winner }: { player: TopCutMatch["winner"]; winner: boolean }) {
  const bye = player.name.toUpperCase() === "BYE";
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 px-2 py-1.5"
      style={{
        backgroundColor: winner
          ? "color-mix(in srgb, var(--success) 7%, transparent)"
          : "transparent",
        opacity: winner || bye ? 1 : 0.68,
      }}
    >
      <span
        className="w-6 shrink-0 font-mono text-[9px] tabular-nums"
        style={{ color: "var(--text-dim)" }}
      >
        {player.seed != null ? `#${player.seed}` : "—"}
      </span>
      <span className="w-4 shrink-0 text-center text-[10px]">
        {countryFlag(player.country)}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-[11px]"
        style={{
          color: winner ? "var(--text)" : "var(--text-muted)",
          fontWeight: winner ? 600 : 400,
        }}
      >
        {player.name}
      </span>
      {winner && !bye && (
        <Check size={10} strokeWidth={3} className="shrink-0" style={{ color: "var(--success)" }} />
      )}
    </div>
  );
}

function MatchCard({ match, final }: { match: TopCutMatch; final: boolean }) {
  return (
    <div
      className="top-cut-match relative z-10 overflow-hidden rounded-lg border shadow-sm"
      style={{
        borderColor: final
          ? "color-mix(in srgb, var(--warning) 48%, var(--border))"
          : "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <PlayerRow player={match.winner} winner />
      <div style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 65%, transparent)" }}>
        <PlayerRow player={match.loser} winner={false} />
      </div>
    </div>
  );
}

function BracketConnectors({
  previousCount,
  currentCount,
}: {
  previousCount: number;
  currentCount: number;
}) {
  if (previousCount === 0 || currentCount === 0) return null;
  const paths: string[] = [];
  for (let index = 0; index < currentCount; index += 1) {
    const feederA = index * 2;
    const feederB = feederA + 1;
    if (feederB >= previousCount) break;
    const y1 = ((feederA + 0.5) / previousCount) * 100;
    const y2 = ((feederB + 0.5) / previousCount) * 100;
    const ym = ((index + 0.5) / currentCount) * 100;
    paths.push(
      `M 0 ${y1} H 50 M 0 ${y2} H 50 M 50 ${y1} V ${y2} M 50 ${ym} H 100`,
    );
  }
  if (paths.length === 0) return null;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute bottom-0 top-0 z-0"
      style={{
        left: "-0.75rem",
        width: "0.75rem",
        height: "100%",
        overflow: "visible",
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={paths.join(" ")}
        fill="none"
        stroke="color-mix(in srgb, var(--border) 82%, transparent)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Collapsible Top Cut diagram. It mirrors the bracket order published by
 * PokéData, but uses the app's own card, border and accent tokens.
 */
export function TopCutBracket({ rounds, sourceUrl }: Props) {
  const { t } = useTranslation();
  if (rounds.length === 0) return null;

  return (
    <details
      open
      className="group mt-4 overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--bg-elev-strong)] [&::-webkit-details-marker]:hidden"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{
            color: "var(--warning)",
            backgroundColor: "color-mix(in srgb, var(--warning) 12%, transparent)",
          }}
        >
          <GitBranch size={13} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold" style={{ color: "var(--text)" }}>
            {t("official.top_cut")}
          </span>
          <span className="block text-[10px]" style={{ color: "var(--text-dim)" }}>
            {rounds[0]?.label} → {rounds[rounds.length - 1]?.label}
          </span>
        </span>
        <span
          className="ml-auto hidden items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline-flex"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
          }}
        >
          <Trophy size={9} />
          PokéData
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform group-open:rotate-180"
          style={{ color: "var(--text-dim)" }}
        />
      </summary>

      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-stretch gap-3">
            {rounds.map((round, roundIndex) => {
              const final = isFinal(round.label);
              const previous = rounds[roundIndex - 1];
              return (
                <div key={round.label} className="top-cut-column flex w-[11rem] flex-col">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: final ? "var(--warning)" : "var(--text-muted)" }}
                    >
                      {round.label}
                    </span>
                    <span
                      className="h-px flex-1"
                      style={{
                        background: final
                          ? "linear-gradient(to right, color-mix(in srgb, var(--warning) 45%, transparent), transparent)"
                          : "linear-gradient(to right, color-mix(in srgb, var(--border) 75%, transparent), transparent)",
                      }}
                    />
                  </div>
                  <div className="top-cut-matches relative flex flex-1 flex-col justify-around gap-2">
                    {previous && (
                      <BracketConnectors
                        previousCount={previous.matches.length}
                        currentCount={round.matches.length}
                      />
                    )}
                    {round.matches.map((match, index) => (
                      <MatchCard
                        key={`${round.label}-${index}-${match.winner.name}`}
                        match={match}
                        final={final}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {sourceUrl && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {t("official.pokedata_note")}
            </span>
            <button
              type="button"
              className="btn-ghost text-[10px]"
              onClick={() => void openExternal(sourceUrl)}
            >
              <ExternalLink size={10} className="mr-1" />
              {t("official.view_source", { source: "PokéData" })}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
