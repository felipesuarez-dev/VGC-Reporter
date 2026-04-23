import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { canonicalSpeciesId } from "../../lib/types";
import { useSearchStore } from "../../stores/searchStore";
import { usePokedexStore } from "../../stores/pokedexStore";
import {
  useMoveDetailStore,
  useItemDetailStore,
  useAbilityDetailStore,
} from "../../stores/entityDetailStore";
import { useLocalize } from "../../hooks/useTranslations";

const RESULT_CAP = 25;

export function GlobalSearchPalette() {
  const { t } = useTranslation();
  const open = useSearchStore((s) => s.open);
  const setOpen = useSearchStore((s) => s.setOpen);
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);

  const localize = useLocalize();
  const openPokemon = usePokedexStore((s) => s.openDetail);
  const openMove = useMoveDetailStore((s) => s.open);
  const openItem = useItemDetailStore((s) => s.open);
  const openAbility = useAbilityDetailStore((s) => s.open);

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

  if (!open) return null;

  const q = query.trim();
  const hasQuery = q.length > 0;
  const anyLoading =
    pokemon.isLoading ||
    moves.isLoading ||
    items.isLoading ||
    abilities.isLoading;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (
    kind: "pokemon" | "move" | "item" | "ability",
    name: string,
  ) => {
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
        className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label={t("search.open")} shouldFilter={hasQuery}>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={t("search.placeholder")}
            className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {!hasQuery && !anyLoading && (
              <div
                className="px-3 py-6 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("search.placeholder")}
              </div>
            )}
            {anyLoading && (
              <div
                className="px-3 py-4 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("search.loading")}
              </div>
            )}
            {hasQuery && (
              <>
                <Command.Empty
                  className="px-3 py-4 text-center text-xs"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("search.no_results")}
                </Command.Empty>
                {pokemon.data && (
                  <Command.Group heading={t("search.section_pokemon")}>
                    {pokemon.data.slice(0, RESULT_CAP * 4).map((p) => (
                      <Command.Item
                        key={`pokemon:${p.name}`}
                        value={`pokemon ${p.name}`}
                        onSelect={() => choose("pokemon", p.name)}
                        className="cursor-pointer rounded px-3 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                        style={{ color: "var(--text)" }}
                      >
                        {p.name}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {moves.data && (
                  <Command.Group heading={t("search.section_moves")}>
                    {moves.data.map((m) => (
                      <Command.Item
                        key={`move:${m}`}
                        value={`move ${m} ${localize("move", m)}`}
                        onSelect={() => choose("move", m)}
                        className="cursor-pointer rounded px-3 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                        style={{ color: "var(--text)" }}
                      >
                        {localize("move", m) || m}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {items.data && (
                  <Command.Group heading={t("search.section_items")}>
                    {items.data.map((i) => (
                      <Command.Item
                        key={`item:${i}`}
                        value={`item ${i} ${localize("item", i)}`}
                        onSelect={() => choose("item", i)}
                        className="cursor-pointer rounded px-3 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                        style={{ color: "var(--text)" }}
                      >
                        {localize("item", i) || i}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {abilities.data && (
                  <Command.Group heading={t("search.section_abilities")}>
                    {abilities.data.map((a) => (
                      <Command.Item
                        key={`ability:${a}`}
                        value={`ability ${a} ${localize("ability", a)}`}
                        onSelect={() => choose("ability", a)}
                        className="cursor-pointer rounded px-3 py-1.5 text-sm data-[selected=true]:bg-[var(--bg-elev-strong)]"
                        style={{ color: "var(--text)" }}
                      >
                        {localize("ability", a) || a}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
