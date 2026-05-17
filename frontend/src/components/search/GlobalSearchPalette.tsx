import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Clock, X } from "lucide-react";

type SearchKind = "pokemon" | "move" | "item" | "ability";
const ALL_KINDS: SearchKind[] = ["pokemon", "move", "item", "ability"];
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { canonicalSpeciesId, type Pokemon } from "../../lib/types";
import { useSearchStore } from "../../stores/searchStore";
import { usePokedexStore } from "../../stores/pokedexStore";
import {
  useMoveDetailStore,
  useItemDetailStore,
  useAbilityDetailStore,
} from "../../stores/entityDetailStore";
import {
  useRecentSearchesStore,
  type RecentSearchKind,
} from "../../stores/recentSearchesStore";
import { useLocalize } from "../../hooks/useTranslations";
import { useMoveSummary } from "../../hooks/useMoveCatalog";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { TypeBadge } from "../pokemon/TypeBadge";
import { MoveCategoryIcon } from "../pokemon/MoveCategoryIcon";

const PER_SECTION_CAP = 15;

function norm(s: string): string {
  return s.toLowerCase();
}

function pokemonMatches(q: string, p: Pokemon): boolean {
  return (
    norm(p.name).includes(q) ||
    norm(p.id).includes(q) ||
    p.types.some((t) => norm(t).includes(q))
  );
}

function textMatches(q: string, ...haystacks: (string | null | undefined)[]): boolean {
  return haystacks.some((h) => h != null && norm(h).includes(q));
}

export function GlobalSearchPalette() {
  const { t } = useTranslation();
  const open = useSearchStore((s) => s.open);
  const setOpen = useSearchStore((s) => s.setOpen);
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);

  const localize = useLocalize();
  const moveSummary = useMoveSummary();
  const openPokemon = usePokedexStore((s) => s.openDetail);
  const openMove = useMoveDetailStore((s) => s.open);
  const openItem = useItemDetailStore((s) => s.open);
  const openAbility = useAbilityDetailStore((s) => s.open);
  const recents = useRecentSearchesStore((s) => s.recents);
  const addRecent = useRecentSearchesStore((s) => s.addRecent);
  const clearRecents = useRecentSearchesStore((s) => s.clearRecents);

  const [activeKinds, setActiveKinds] = useState<Set<SearchKind>>(new Set());
  const toggleKind = (k: SearchKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const clearKinds = () => setActiveKinds(new Set());
  const kindActive = (k: SearchKind) => activeKinds.size === 0 || activeKinds.has(k);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey && isK) {
        e.preventDefault();
        useSearchStore.getState().setOpen(true);
        return;
      }
      if (e.key === "Escape" && useSearchStore.getState().open) {
        useSearchStore.getState().setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pokemon = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    enabled: open,
    staleTime: Infinity,
  });
  const moves = useQuery({
    queryKey: ["search", "moves"] as const,
    queryFn: () => ipc.listMoves(),
    enabled: open,
    staleTime: Infinity,
  });
  const items = useQuery({
    queryKey: ["search", "items"] as const,
    queryFn: () => ipc.listItems(),
    enabled: open,
    staleTime: Infinity,
  });
  const abilities = useQuery({
    queryKey: ["search", "abilities"] as const,
    queryFn: () => ipc.listAbilities(),
    enabled: open,
    staleTime: Infinity,
  });

  const q = query.trim();
  const qn = norm(q);
  const hasQuery = q.length > 0;

  const pokemonMatchesList = useMemo(() => {
    if (!hasQuery || !pokemon.data) return [] as Pokemon[];
    return pokemon.data
      .filter((p) => pokemonMatches(qn, p))
      .slice(0, PER_SECTION_CAP);
  }, [hasQuery, qn, pokemon.data]);

  const movesMatchesList = useMemo(() => {
    if (!hasQuery || !moves.data) return [] as string[];
    return moves.data
      .filter((m) => textMatches(qn, m, localize("move", m)))
      .slice(0, PER_SECTION_CAP);
  }, [hasQuery, qn, moves.data, localize]);

  const itemsMatchesList = useMemo(() => {
    if (!hasQuery || !items.data) return [] as string[];
    return items.data
      .filter((i) => textMatches(qn, i, localize("item", i)))
      .slice(0, PER_SECTION_CAP);
  }, [hasQuery, qn, items.data, localize]);

  const abilitiesMatchesList = useMemo(() => {
    if (!hasQuery || !abilities.data) return [] as string[];
    return abilities.data
      .filter((a) => textMatches(qn, a, localize("ability", a)))
      .slice(0, PER_SECTION_CAP);
  }, [hasQuery, qn, abilities.data, localize]);

  const pokemonByKey = useMemo(() => {
    const map = new Map<string, Pokemon>();
    if (pokemon.data) {
      for (const p of pokemon.data) {
        map.set(canonicalSpeciesId(p.name), p);
      }
    }
    return map;
  }, [pokemon.data]);

  if (!open) return null;

  const anyLoading =
    pokemon.isLoading ||
    moves.isLoading ||
    items.isLoading ||
    abilities.isLoading;

  const totalMatches =
    pokemonMatchesList.length +
    movesMatchesList.length +
    itemsMatchesList.length +
    abilitiesMatchesList.length;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (kind: RecentSearchKind, name: string) => {
    addRecent(kind, name);
    close();
    if (kind === "pokemon") openPokemon(canonicalSpeciesId(name));
    else if (kind === "move") openMove(name);
    else if (kind === "item") openItem(name);
    else if (kind === "ability") openAbility(name);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("search.open")}
      className="fixed inset-0 z-[65] flex items-start justify-center bg-black/60 p-4 pt-24"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label={t("search.open")} shouldFilter={false}>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={t("search.placeholder")}
            className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <div
            className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            {ALL_KINDS.map((k) => {
              const active = activeKinds.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  tabIndex={-1}
                  aria-pressed={active}
                  onClick={() => toggleKind(k)}
                  className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide transition"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    backgroundColor: active
                      ? "var(--accent-soft)"
                      : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {t(`search.filter_${k}`)}
                </button>
              );
            })}
            {activeKinds.size > 0 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={clearKinds}
                className="ml-auto shrink-0 text-[10px] underline decoration-dotted"
                style={{ color: "var(--text-dim)" }}
              >
                {t("search.filter_clear")}
              </button>
            )}
          </div>
          <Command.List className="max-h-[65vh] overflow-y-auto p-2">
            {!hasQuery && recents.length === 0 && !anyLoading && (
              <div
                className="px-3 py-8 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("search.placeholder")}
              </div>
            )}
            {!hasQuery &&
              recents.length > 0 &&
              recents.filter((r) => kindActive(r.kind as SearchKind)).length > 0 && (
                <Command.Group
                  heading={
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} />
                        {t("search.recent")}
                      </span>
                      <button
                        type="button"
                        onClick={clearRecents}
                        className="text-[10px] underline decoration-dotted hover:text-[var(--text)]"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {t("search.clear_recent")}
                      </button>
                    </div>
                  }
                >
                  {recents
                    .filter((r) => kindActive(r.kind as SearchKind))
                    .map((r) => (
                      <RecentItem
                        key={`recent:${r.kind}:${r.name}`}
                        recent={r}
                        pokemonByKey={pokemonByKey}
                        localize={localize}
                        moveSummary={moveSummary}
                        onSelect={() => choose(r.kind, r.name)}
                      />
                    ))}
                </Command.Group>
              )}
            {hasQuery && anyLoading && (
              <div
                className="px-3 py-4 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("search.loading")}
              </div>
            )}
            {hasQuery && !anyLoading && totalMatches === 0 && (
              <div
                className="px-3 py-6 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("search.no_results")}
              </div>
            )}
            {hasQuery && kindActive("pokemon") && pokemonMatchesList.length > 0 && (
              <Command.Group heading={t("search.section_pokemon")}>
                {pokemonMatchesList.map((p) => (
                  <Command.Item
                    key={`pokemon:${p.name}`}
                    value={`pokemon-${p.name}-${p.id}`}
                    onSelect={() => choose("pokemon", p.name)}
                    className="cursor-pointer rounded px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                    style={{ color: "var(--text)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                        <PokemonSprite
                          url={p.sprite_url}
                          fallbackUrl={p.sprite_fallback_url}
                          homeUrl={p.home_sprite_url ?? undefined}
                          name={p.name}
                          size={28}
                          variant="pixel"
                        />
                      </div>
                      <span className="flex-1 truncate">{p.name}</span>
                      <div className="flex gap-0.5">
                        {p.types.map((ty) => (
                          <TypeBadge key={ty} type={ty} />
                        ))}
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {hasQuery && kindActive("move") && movesMatchesList.length > 0 && (
              <Command.Group heading={t("search.section_moves")}>
                {movesMatchesList.map((m) => {
                  const summary = moveSummary(m);
                  return (
                    <Command.Item
                      key={`move:${m}`}
                      value={`move-${m}`}
                      onSelect={() => choose("move", m)}
                      className="cursor-pointer rounded px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                      style={{ color: "var(--text)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate">
                          {localize("move", m) || m}
                        </span>
                        {summary && (
                          <>
                            <TypeBadge type={summary.type_} />
                            <span
                              className="inline-flex items-center rounded border px-1 py-0.5 text-[9px]"
                              style={{
                                color: "var(--text-muted)",
                                borderColor: "var(--border)",
                              }}
                              title={t(
                                `tooltip.move_category.${summary.category.toLowerCase()}`,
                              )}
                            >
                              <MoveCategoryIcon category={summary.category} />
                            </span>
                          </>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
            {hasQuery && kindActive("item") && itemsMatchesList.length > 0 && (
              <Command.Group heading={t("search.section_items")}>
                {itemsMatchesList.map((i) => (
                  <Command.Item
                    key={`item:${i}`}
                    value={`item-${i}`}
                    onSelect={() => choose("item", i)}
                    className="cursor-pointer rounded px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                    style={{ color: "var(--text)" }}
                  >
                    {localize("item", i) || i}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {hasQuery && kindActive("ability") && abilitiesMatchesList.length > 0 && (
              <Command.Group heading={t("search.section_abilities")}>
                {abilitiesMatchesList.map((a) => (
                  <Command.Item
                    key={`ability:${a}`}
                    value={`ability-${a}`}
                    onSelect={() => choose("ability", a)}
                    className="cursor-pointer rounded px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                    style={{ color: "var(--text)" }}
                  >
                    {localize("ability", a) || a}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

interface RecentItemProps {
  recent: { kind: RecentSearchKind; name: string };
  pokemonByKey: Map<string, Pokemon>;
  localize: (kind: "ability" | "move" | "item", n: string) => string;
  moveSummary: ReturnType<typeof useMoveSummary>;
  onSelect: () => void;
}

function RecentItem({
  recent,
  pokemonByKey,
  localize,
  moveSummary,
  onSelect,
}: RecentItemProps) {
  const { t } = useTranslation();
  const { kind, name } = recent;
  const sectionKey = `search.section_${
    kind === "pokemon" ? "pokemon" : kind + "s"
  }` as const;

  let label = name;
  if (kind === "move" || kind === "item" || kind === "ability") {
    label = localize(kind, name) || name;
  }

  const p = kind === "pokemon" ? pokemonByKey.get(canonicalSpeciesId(name)) : null;
  const summary = kind === "move" ? moveSummary(name) : null;

  return (
    <Command.Item
      value={`recent-${kind}-${name}`}
      onSelect={onSelect}
      className="cursor-pointer rounded px-2 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
      style={{ color: "var(--text)" }}
    >
      <div className="flex items-center gap-2">
        {p ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            <PokemonSprite
              url={p.sprite_url}
              fallbackUrl={p.sprite_fallback_url}
              homeUrl={p.home_sprite_url ?? undefined}
              name={p.name}
              size={28}
              variant="pixel"
            />
          </div>
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            <Clock size={14} style={{ color: "var(--text-dim)" }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate">{label}</div>
          <div
            className="text-[10px] uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {t(sectionKey)}
          </div>
        </div>
        {p && (
          <div className="flex gap-0.5">
            {p.types.map((ty) => (
              <TypeBadge key={ty} type={ty} />
            ))}
          </div>
        )}
        {summary && <TypeBadge type={summary.type_} />}
      </div>
    </Command.Item>
  );
}
