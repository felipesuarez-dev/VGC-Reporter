import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, formatDateTime } from "../lib/formatDate";
import { formatLabel } from "../lib/labels";
import { type ChampionsTournament } from "../lib/types";
import { UsageBarChart, type UsageBarItem } from "../components/charts/UsageBarChart";
import { TopList } from "../components/charts/TopList";
import { TrendingCard } from "../components/charts/TrendingCard";
import { PokemonDetailModal } from "../components/pokemon/PokemonDetailModal";
import { FormatSelector } from "../components/ui/FormatSelector";
import { XCard } from "../components/dashboard/XCard";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
import { SourcesChip } from "../components/layout/SourcesChip";
import { SearchTextInput } from "../components/filters/SearchTextInput";
import { useDashboardStore } from "../stores/dashboardStore";
import { usePokedexStore } from "../stores/pokedexStore";

function canonicalSpeciesId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const EXTERNAL_SITES: { name: string; url: string }[] = [
  { name: "Labmaus", url: "https://labmaus.net/" },
  { name: "Pikalytics", url: "https://www.pikalytics.com/" },
  { name: "Pokebase", url: "https://pokebase.app/pokemon-champions" },
  { name: "Pokemon-Zone", url: "https://pokemon-zone.com/" },
  { name: "Champions Lab", url: "https://championslab.xyz/" },
  { name: "Munchstats", url: "https://munchstats.com/" },
];

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const format = useDashboardStore((s) => s.format);
  const favoriteFormat = useDashboardStore((s) => s.favoriteFormat);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (format !== favoriteFormat) setFormat(favoriteFormat);
  }, [favoriteFormat, format, setFormat]);
  const openDetail = usePokedexStore((s) => s.openDetail);
  const openSpecies = (species: string) => openDetail(canonicalSpeciesId(species));
  const [selectedTournament, setSelectedTournament] =
    useState<ChampionsTournament | null>(null);
  const TOURNAMENT_INITIAL = 10;
  const TOURNAMENT_PAGE = 10;
  const [tournamentVisible, setTournamentVisible] = useState(TOURNAMENT_INITIAL);
  const [tournamentSearch, setTournamentSearch] = useState("");
  const tournamentLimit = tournamentVisible;
  const POKE_INITIAL = 10;
  const POKE_PAGE = 10;
  const [pokeVisible, setPokeVisible] = useState(POKE_INITIAL);
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });
  const { data: championsReportRaw, isFetching: championsFetching } = useQuery({
    queryKey: queryKeys.championsReport(format, tournamentLimit),
    queryFn: () => ipc.listChampionsTournaments(format, tournamentLimit),
    staleTime: 30 * 60 * 1000,
  });
  const championsReport = championsReportRaw
    ? {
        ...championsReportRaw,
        tournaments: championsReportRaw.tournaments.filter(
          (t) =>
            !(t.name ?? "").toUpperCase().includes("TCG") &&
            !(t.format ?? "").toUpperCase().includes("TCG"),
        ),
      }
    : championsReportRaw;

  const allPokemon = data?.pokemon ?? [];
  const topPokemon = allPokemon.slice(0, pokeVisible);
  const chartPokemon: UsageBarItem[] = topPokemon.map((p) => ({
    name: p.species,
    usage_percent: p.usage_percent,
    count: p.count,
    sprite_url: p.sprite_url,
    sprite_fallback_url: p.sprite_fallback_url,
    home_sprite_url: p.home_sprite_url,
    id: p.species,
  }));
  const handleBarClick = (item: UsageBarItem) => {
    openSpecies(String(item.id));
  };
  const showMetaSkeleton = isFetching && !data;
  const topItems = data?.top_items ?? [];
  const topMoves = data?.top_moves ?? [];
  const topAbilities = data?.top_abilities ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex items-center gap-2">
          <FormatSelector
            value={format}
            favorite={favoriteFormat}
            onChange={setFormat}
            onFavoriteChange={setFavoriteFormat}
            className="w-72"
          />
          <button
            className="btn-ghost"
            onClick={() =>
              qc.invalidateQueries({
                queryKey: queryKeys.meta(format),
              })
            }
          >
            <RefreshCw size={14} className="mr-1" />
            {t("dashboard.refresh")}
          </button>
        </div>
      </header>
      {data && (
        <div className="-mt-4 flex items-center gap-2">
          <SourcesChip
            tournamentsUsed={data.tournaments_used}
            battlesAnalyzed={data.battles_analyzed}
            fromDate={data.from_date}
            toDate={data.to_date}
            totalEntries={data.total_entries}
          />
        </div>
      )}

      {isLoading && <MetaSkeleton label={t("common.loading")} />}
      {showMetaSkeleton && !isLoading && <MetaSkeleton label={t("common.loading")} />}
      {isError && (
        <div className="card text-red-400">
          {t("common.error")}: {(error as Error)?.message ?? "unknown"}
        </div>
      )}
      {data && data.pokemon.length === 0 && !isFetching && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("dashboard.empty_format")}
        </div>
      )}

      {data && data.pokemon.length > 0 && (
        <>
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("dashboard.top_pokemon")}
            </h2>
            <UsageBarChart
              data={chartPokemon}
              height={Math.max(440, topPokemon.length * 48)}
              onBarClick={handleBarClick}
            />
            {(allPokemon.length > pokeVisible || pokeVisible > POKE_INITIAL) && (
              <div className="mt-3 flex justify-center gap-2">
                {allPokemon.length > pokeVisible && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setPokeVisible((n) => n + POKE_PAGE)}
                  >
                    {t("common.see_more")}
                  </button>
                )}
                {pokeVisible > POKE_INITIAL && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setPokeVisible(POKE_INITIAL)}
                  >
                    {t("common.see_less")}
                  </button>
                )}
              </div>
            )}
          </section>

          <TrendingCard format={format} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_items")}
              </h2>
              <TopList data={topItems} limit={10} entityKind="item" />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_moves")}
              </h2>
              <TopList data={topMoves} limit={10} entityKind="move" />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_abilities")}
              </h2>
              <TopList data={topAbilities} limit={10} entityKind="ability" />
            </div>
          </section>

        </>
      )}

      <section className="card">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {format === "regulation-m-a"
            ? t("dashboard.champions_report")
            : t("dashboard.recent_tournaments")}
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("dashboard.tournaments_for_format", {
            format: formatLabel(t, format),
          })}
        </p>
        {championsReport && championsReport.tournaments.length > 0 && (
          <div className="mb-2">
            <SearchTextInput
              value={tournamentSearch}
              onChange={setTournamentSearch}
              placeholder={t("common.filter_search_tournament")}
            />
          </div>
        )}
        {(championsFetching || !championsReport) && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("common.loading")}
          </p>
        )}
        {championsReport &&
          !championsFetching &&
          championsReport.tournaments.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("common.empty")}
            </p>
          )}
        {championsReport && championsReport.tournaments.length > 0 && (
          <ul className="divide-y divide-[var(--border)]">
            {championsReport.tournaments
              .filter((tour) => {
                const q = tournamentSearch.trim().toLowerCase();
                if (!q) return true;
                return (tour.name ?? "").toLowerCase().includes(q);
              })
              .map((tour) => (
              <li
                key={tour.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {tour.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {tour.date && <span>{formatDateTime(tour.date, i18n.language)}</span>}
                    {tour.players != null && (
                      <span> · {tour.players} {t("dashboard.players")}</span>
                    )}
                    {tour.format && <span> · {tour.format}</span>}
                  </div>
                </div>
                <button
                  className="btn-ghost shrink-0 text-xs"
                  onClick={() => setSelectedTournament(tour)}
                >
                  {t("dashboard.view_standings")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {championsReport && championsReport.tournaments.length > 0 && (
          <div className="mt-2 flex justify-center gap-2">
            {championsReport.tournaments.length >= tournamentVisible && (
              <button
                className="btn-ghost text-xs"
                onClick={() =>
                  setTournamentVisible((n) => n + TOURNAMENT_PAGE)
                }
              >
                {t("dashboard.view_more")}
              </button>
            )}
            {tournamentVisible > TOURNAMENT_INITIAL && (
              <button
                className="btn-ghost text-xs"
                onClick={() => setTournamentVisible(TOURNAMENT_INITIAL)}
              >
                {t("dashboard.view_less")}
              </button>
            )}
          </div>
        )}
      </section>

      <UpcomingTournamentsSection />

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("dashboard.external_sources")}
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <XCard handle="VGCdata" url="https://x.com/VGCdata" />
          <XCard handle="VGChampStats" url="https://x.com/VGChampStats" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {EXTERNAL_SITES.map((site) => (
            <button
              key={site.name}
              type="button"
              onClick={() => openExternal(site.url)}
              className="btn-ghost flex items-center justify-center gap-1.5 text-xs"
            >
              <ExternalLink size={12} />
              {site.name}
            </button>
          ))}
        </div>
      </section>

      <PokemonDetailModal />
      <TournamentStandingsDrawer
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
    </div>
  );
}

function MetaSkeleton({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div
        className="card flex items-start gap-3"
        style={{ color: "var(--text-muted)" }}
      >
        <RefreshCw size={14} className="mt-0.5 animate-spin" />
        <div>
          <div className="text-sm">{label}</div>
          <div
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--text-dim)" }}
          >
            {t("dashboard.loading_patience")}
          </div>
        </div>
      </div>
      <div className="card">
        <div
          className="mb-3 h-4 w-32 animate-pulse rounded"
          style={{ backgroundColor: "var(--bg-elev-strong)" }}
        />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded"
              style={{
                width: `${100 - i * 8}%`,
                backgroundColor: "var(--bg-elev-strong)",
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card">
            <div
              className="mb-3 h-4 w-24 animate-pulse rounded"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="h-4 w-full animate-pulse rounded"
                  style={{ backgroundColor: "var(--bg-elev-strong)", opacity: 0.7 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingTournamentsSection() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.upcomingTournaments(),
    queryFn: () => ipc.listUpcomingTournaments(),
    staleTime: 30 * 60 * 1000,
  });
  const events = data ?? [];
  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("upcoming.title")}
      </h2>
      <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("upcoming.window")}
      </p>
      {isLoading && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("common.loading")}
        </p>
      )}
      {!isLoading && events.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("upcoming.empty")}
        </p>
      )}
      {events.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                  {ev.name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <span>{formatDate(ev.date, i18n.language)}</span>
                  {ev.players != null && (
                    <span> · {ev.players} {t("dashboard.players")}</span>
                  )}
                  {ev.region && <span> · {ev.region}</span>}
                </div>
              </div>
              <button
                className="btn-ghost shrink-0 text-xs"
                onClick={() => openExternal(ev.url)}
              >
                <ExternalLink size={12} className="mr-1 inline" />
                {t("upcoming.open")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
