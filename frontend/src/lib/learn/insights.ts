import type {
  MetaSnapshot,
  PokemonUsage,
  TrendingReport,
  UsageEntry,
} from "../types";

export type InsightConfidence = "high" | "medium" | "low";

export const MIN_INSIGHT_SAMPLE = 30;

export interface InsightSubject {
  name: string;
  sample: number;
  sources: number;
  confidence: InsightConfidence;
  value: number;
}

export interface LearnedMetaInsights {
  bestWin: (InsightSubject & { winRate: number }) | null;
  bestTopCut: (InsightSubject & { topCutRate: number }) | null;
  emerging:
    | (InsightSubject & { change: number; usage: number })
    | null;
  antiMeta:
    | (InsightSubject & { winRate: number; usage: number })
    | null;
  speedControl: (InsightSubject & { usage: number }) | null;
  keyItem: (InsightSubject & { usage: number }) | null;
}

export function confidenceFor(
  sample: number,
  sources: number,
): InsightConfidence {
  if (sample >= 100 && sources >= 2) return "high";
  if (sample >= MIN_INSIGHT_SAMPLE) return "medium";
  return "low";
}

function eligible(entry: PokemonUsage): boolean {
  return entry.count >= MIN_INSIGHT_SAMPLE;
}

function subject(entry: PokemonUsage, value: number): InsightSubject {
  return {
    name: entry.species,
    sample: entry.count,
    sources: entry.sources_covering,
    confidence: confidenceFor(entry.count, entry.sources_covering),
    value,
  };
}

function topMove(moves: UsageEntry[]): UsageEntry | null {
  const speedMoves = moves.filter((move) =>
    /tailwind|trick room|icy wind|electroweb/i.test(move.name),
  );
  return speedMoves.sort((a, b) => b.usage_percent - a.usage_percent)[0] ?? null;
}

/**
 * Pure Learn 2.0 insight algorithm. Every card declares sample size and
 * source coverage; a 2-team 100% win rate can never beat a larger sample.
 */
export function computeMetaInsights(
  snapshot: MetaSnapshot | undefined,
  trending: TrendingReport | undefined,
): LearnedMetaInsights {
  const pokemon = snapshot?.pokemon ?? [];
  const bestWinEntry =
    pokemon
      .filter((entry) => eligible(entry) && entry.win_rate != null)
      .sort(
        (a, b) =>
          (b.win_rate ?? 0) - (a.win_rate ?? 0) ||
          b.count - a.count,
      )[0] ?? null;
  const bestTopCutEntry =
    pokemon
      .filter((entry) => eligible(entry) && entry.top_cut_rate != null)
      .sort(
        (a, b) =>
          (b.top_cut_rate ?? 0) - (a.top_cut_rate ?? 0) ||
          b.count - a.count,
      )[0] ?? null;
  const rising = trending?.rising ?? [];
  const emergingEntry = rising
    .map((entry) => {
      const usage = pokemon.find(
        (candidate) =>
          candidate.species.toLowerCase() === entry.species.toLowerCase(),
      );
      return usage && eligible(usage)
        ? { trend: entry, usage }
        : null;
    })
    .filter(
      (entry): entry is { trend: (typeof rising)[number]; usage: PokemonUsage } =>
        entry !== null,
    )
    .sort(
      (a, b) =>
        b.trend.change_percentage - a.trend.change_percentage ||
        b.usage.count - a.usage.count,
    )[0];
  const antiMetaEntry =
    pokemon
      .filter(
        (entry) =>
          eligible(entry) &&
          entry.win_rate != null &&
          entry.usage_percent <= 15,
      )
      .sort(
        (a, b) =>
          (b.win_rate ?? 0) - (a.win_rate ?? 0) ||
          b.count - a.count,
      )[0] ?? null;
  const speed = topMove(snapshot?.top_moves ?? []);
  const item = snapshot?.top_items?.[0] ?? null;
  const sourceCount = snapshot?.sources?.length ?? 0;

  return {
    bestWin:
      bestWinEntry && bestWinEntry.win_rate != null
        ? {
            ...subject(bestWinEntry, bestWinEntry.win_rate),
            winRate: bestWinEntry.win_rate,
          }
        : null,
    bestTopCut:
      bestTopCutEntry && bestTopCutEntry.top_cut_rate != null
        ? {
            ...subject(bestTopCutEntry, bestTopCutEntry.top_cut_rate),
            topCutRate: bestTopCutEntry.top_cut_rate,
          }
        : null,
    emerging: emergingEntry
      ? {
          ...subject(emergingEntry.usage, emergingEntry.trend.change_percentage),
          change: emergingEntry.trend.change_percentage,
          usage: emergingEntry.usage.usage_percent,
        }
      : null,
    antiMeta:
      antiMetaEntry && antiMetaEntry.win_rate != null
        ? {
            ...subject(antiMetaEntry, antiMetaEntry.win_rate),
            winRate: antiMetaEntry.win_rate,
            usage: antiMetaEntry.usage_percent,
          }
        : null,
    speedControl: speed
      ? {
          name: speed.name,
          sample: snapshot?.total_entries ?? 0,
          sources: sourceCount,
          confidence: confidenceFor(snapshot?.total_entries ?? 0, sourceCount),
          value: speed.usage_percent,
          usage: speed.usage_percent,
        }
      : null,
    keyItem: item
      ? {
          name: item.name,
          sample: snapshot?.total_entries ?? 0,
          sources: sourceCount,
          confidence: confidenceFor(snapshot?.total_entries ?? 0, sourceCount),
          value: item.usage_percent,
          usage: item.usage_percent,
        }
      : null,
  };
}
