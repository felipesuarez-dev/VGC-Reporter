import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { usePikalyticsEntry } from "../../hooks/usePikalyticsEntry";
import { usePokedexStore } from "../../stores/pokedexStore";
import { canonicalSpeciesId } from "../../lib/types";
import { EntityChip } from "../info/EntityChip";
import { PokemonSprite } from "./PokemonSprite";
import type {
  PikalyticsEvSpread,
  PikalyticsItem,
  PikalyticsTeammate,
} from "../../lib/types";

interface Props {
  species: string;
}

export function PikalyticsSection({ species }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePikalyticsEntry(species);

  if (isError) {
    return (
      <section className="mb-4 space-y-2">
        <SectionHeader source={null} />
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("pokemon_detail.pikalytics_unavailable")}
        </p>
      </section>
    );
  }

  if (isLoading || !data) {
    return (
      <section className="mb-4 space-y-3" aria-busy="true">
        <SectionHeader source={null} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  const nothing =
    data.common_items.length === 0 &&
    data.common_abilities.length === 0 &&
    data.common_moves.length === 0 &&
    data.common_teammates.length === 0 &&
    data.ev_spreads.length === 0;

  return (
    <section className="mb-4 space-y-3">
      <SectionHeader source={data.source_url} />
      {nothing && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("pokemon_detail.pikalytics_unavailable")}
        </p>
      )}
      {!nothing && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EntityCard
              title={t("pokemon_detail.pikalytics.items")}
              entries={data.common_items}
              kind="item"
            />
            <EntityCard
              title={t("pokemon_detail.pikalytics.moves")}
              entries={data.common_moves}
              kind="move"
            />
            <EntityCard
              title={t("pokemon_detail.pikalytics.abilities")}
              entries={data.common_abilities}
              kind="ability"
            />
            <TeammateList
              title={t("pokemon_detail.pikalytics.teammates")}
              entries={data.common_teammates}
            />
          </div>
          <SpreadList
            title={t("pokemon_detail.pikalytics.spreads")}
            entries={data.ev_spreads}
          />
        </>
      )}
    </section>
  );
}

function SectionHeader({ source }: { source: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {t("pokemon_detail.pikalytics.title")}
      </h3>
      {source && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] hover:underline"
          style={{ color: "var(--text-dim)" }}
          onClick={() => {
            void openUrl(source);
          }}
        >
          <ExternalLink size={10} aria-hidden />
          Pikalytics
        </button>
      )}
    </div>
  );
}

function Percent({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <span
      className="shrink-0 tabular-nums text-[11px]"
      style={{ color: "var(--accent)" }}
    >
      {value.toFixed(1)}%
    </span>
  );
}

function EmptyRow() {
  return (
    <li className="text-xs" style={{ color: "var(--text-dim)" }}>
      —
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev)" }}
    >
      <h4
        className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h4>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

function EntityCard({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: PikalyticsItem[];
  kind: "item" | "move" | "ability";
}) {
  return (
    <Card title={title}>
      {entries.length === 0 && <EmptyRow />}
      {entries.slice(0, 6).map((e, i) => (
        <li
          key={`${e.name}-${i}`}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <EntityChip kind={kind} name={e.name} />
          <Percent value={e.usage_percent} />
        </li>
      ))}
    </Card>
  );
}

function TeammateList({
  title,
  entries,
}: {
  title: string;
  entries: PikalyticsTeammate[];
}) {
  const openDetail = usePokedexStore((s) => s.openDetail);
  return (
    <Card title={title}>
      {entries.length === 0 && <EmptyRow />}
      {entries.slice(0, 6).map((e, i) => (
        <li key={`${e.species}-${i}`}>
          <button
            type="button"
            onClick={() => openDetail(canonicalSpeciesId(e.species))}
            className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-xs hover:bg-[var(--bg-elev-strong)]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <PokemonSprite
                url={e.sprite_url ?? ""}
                name={e.species}
                variant="pixel"
                size={24}
              />
              <span className="truncate" style={{ color: "var(--text)" }}>
                {e.species}
              </span>
            </span>
            <Percent value={e.usage_percent} />
          </button>
        </li>
      ))}
    </Card>
  );
}

function SkeletonCard() {
  return (
    <section
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev)" }}
    >
      <div
        className="mb-2 h-2 w-16 animate-pulse rounded"
        style={{ backgroundColor: "var(--bg-elev-strong)" }}
      />
      <ul className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span
              className="h-2 flex-1 animate-pulse rounded"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            />
            <span
              className="h-2 w-8 animate-pulse rounded"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SpreadList({
  title,
  entries,
}: {
  title: string;
  entries: PikalyticsEvSpread[];
}) {
  return (
    <Card title={title}>
      {entries.length === 0 && <EmptyRow />}
      {entries.slice(0, 4).map((e, i) => (
        <li key={i} className="text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate" style={{ color: "var(--text)" }}>
              {e.label}
            </span>
            <Percent value={e.usage_percent} />
          </div>
          {e.nature && (
            <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {e.nature}
            </div>
          )}
        </li>
      ))}
    </Card>
  );
}
