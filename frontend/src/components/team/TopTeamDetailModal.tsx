import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ClipboardCopy, X } from "lucide-react";
import type { EvStatSpread, Nature, Team, TeamMember, TopTeam } from "../../lib/types";
import { ALL_NATURES, emptyTeamMember } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { EntityChip } from "../info/EntityChip";
import { Tooltip } from "../ui/Tooltip";
import { useTeamBuilder } from "../../stores/teamBuilderStore";

interface Props {
  team: TopTeam | null;
  onClose: () => void;
}

function formatEvs(evs: EvStatSpread): string {
  const parts: string[] = [];
  if (evs.hp) parts.push(`${evs.hp} HP`);
  if (evs.atk) parts.push(`${evs.atk} Atk`);
  if (evs.def) parts.push(`${evs.def} Def`);
  if (evs.spa) parts.push(`${evs.spa} SpA`);
  if (evs.spd) parts.push(`${evs.spd} SpD`);
  if (evs.spe) parts.push(`${evs.spe} Spe`);
  return parts.join(" / ") || "—";
}

function asNature(value: string | null | undefined): Nature | null {
  if (!value) return null;
  const match = ALL_NATURES.find(
    (n) => n.toLowerCase() === value.toLowerCase(),
  );
  return match ?? null;
}

export function computeMissingFields(team: Team, t: TFunction): string[] {
  const missing: string[] = [];
  team.members.forEach((m, i) => {
    if (!m.species) return;
    const slot = `${i + 1}. ${m.species}`;
    if (!m.nature)
      missing.push(t("team_builder.import_incomplete.missing_nature", { slot }));
    const evSum =
      m.evs.hp + m.evs.atk + m.evs.def + m.evs.spa + m.evs.spd + m.evs.spe;
    if (evSum === 0)
      missing.push(t("team_builder.import_incomplete.missing_evs", { slot }));
    if (!m.ability)
      missing.push(t("team_builder.import_incomplete.missing_ability", { slot }));
    if (!m.item)
      missing.push(t("team_builder.import_incomplete.missing_item", { slot }));
    if (m.moves.filter((mv) => mv && mv.length > 0).length < 4) {
      missing.push(t("team_builder.import_incomplete.missing_moves", { slot }));
    }
  });
  return missing;
}

function toDraftTeam(top: TopTeam): Team {
  const validMembers = top.members.filter(
    (m) => m && m.species && m.species.length > 0,
  );
  const members: TeamMember[] = Array.from({ length: 6 }, (_, i) => {
    const m = validMembers[i];
    if (!m) return emptyTeamMember();
    return {
      species: m.species,
      item: m.item ?? null,
      ability: m.ability ?? null,
      nature: asNature(m.nature),
      tera_type: null,
      moves: (m.moves ?? []).filter((mv) => mv && mv.length > 0),
      evs: m.evs
        ? {
            hp: m.evs.hp,
            atk: m.evs.atk,
            def: m.evs.def,
            spa: m.evs.spa,
            spd: m.evs.spd,
            spe: m.evs.spe,
          }
        : { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };
  });
  const name = top.player
    ? `${top.player} — ${top.tournament}`
    : top.tournament;
  return {
    id: null,
    name,
    format: "regulation-m-a",
    notes: null,
    members,
    created_at: null,
    updated_at: null,
  };
}

export function TopTeamDetailModal({ team, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setPendingImport = useTeamBuilder((s) => s.setPendingImport);
  const setPendingImportMissing = useTeamBuilder(
    (s) => s.setPendingImportMissing,
  );

  useEffect(() => {
    if (!team) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [team, onClose]);

  if (!team) return null;

  const hasRichInfo = team.members.some(
    (m) => m.ability || (m.moves && m.moves.length > 0),
  );

  const copyToBuilder = () => {
    const draft = toDraftTeam(team);
    setPendingImport(draft);
    setPendingImportMissing(computeMissingFields(draft, t));
    onClose();
    navigate("/team-builder");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={onClose}
          aria-label={t("pokemon_detail.close")}
        >
          <X size={18} />
        </button>

        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 pr-8">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              {team.player ?? "—"}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.tournament")}: {team.tournament}
              {team.placing != null && (
                <> · {t("top_teams.placing")}: #{team.placing}</>
              )}
              {team.record && <> · {t("top_teams.record")}: {team.record}</>}
            </p>
          </div>
          <Tooltip content={t("top_teams.copy_to_builder")}>
            <button
              type="button"
              onClick={copyToBuilder}
              className="btn-ghost flex items-center gap-1 text-xs"
            >
              <ClipboardCopy size={14} />
              {t("top_teams.copy_to_builder")}
            </button>
          </Tooltip>
        </header>

        {!hasRichInfo && (
          <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
            {t("top_teams.limited_info")}
          </p>
        )}

        <section
          aria-label={t("top_teams.members")}
          className="grid grid-cols-1 gap-3 lg:grid-cols-2"
        >
          {team.members.map((m, i) => (
            <div
              key={i}
              className="rounded-lg border p-3"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg-elev)",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex aspect-square h-24 w-24 shrink-0 items-center justify-center">
                  <PokemonSprite
                    url={m.sprite_url}
                    fallbackUrl={m.sprite_fallback_url}
                    homeUrl={m.home_sprite_url ?? undefined}
                    name={m.species}
                    size={96}
                    variant="hd"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {m.species}
                  </div>
                  <div className="mt-1 space-y-0.5 text-[11px]">
                    {m.item && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>
                          {t("top_teams.item")}:
                        </span>{" "}
                        <EntityChip kind="item" name={m.item} />
                      </div>
                    )}
                    {m.ability && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>
                          {t("top_teams.ability")}:
                        </span>{" "}
                        <EntityChip kind="ability" name={m.ability} />
                      </div>
                    )}
                    {m.nature && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>
                          {t("team_builder.nature")}:
                        </span>{" "}
                        {t(`natures.${m.nature}`, { defaultValue: m.nature })}
                      </div>
                    )}
                    {m.tera_type && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>
                          {t("top_teams.tera_type")}:
                        </span>{" "}
                        <span style={{ color: "var(--text)" }}>
                          {t(`types.${m.tera_type}`, { defaultValue: m.tera_type })}
                        </span>
                      </div>
                    )}
                    {m.evs && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>EVs:</span>{" "}
                        <span
                          className="tabular-nums"
                          style={{ color: "var(--text)" }}
                        >
                          {formatEvs(m.evs)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {m.moves && m.moves.length > 0 && (
                <div className="mt-2">
                  <div
                    className="text-[10px] uppercase tracking-wide"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {t("top_teams.moves")}
                  </div>
                  <ul className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    {m.moves.map((mv, j) => (
                      <li key={j} style={{ color: "var(--text)" }}>
                        • <EntityChip kind="move" name={mv} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
