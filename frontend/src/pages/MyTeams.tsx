import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Copy, Download, Pencil, Trash2, Plus, Upload } from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { useRegulationCatalog } from "../hooks/useRegulationCatalog";
import { regulationLabel } from "../lib/regulations";
import type { RegulationInfo } from "../lib/types";
import { MiniTeam, type MiniTeamMember } from "../components/pokemon/MiniTeam";
import { ExportTeamsModal } from "../components/team/ExportTeamsModal";
import { ImportTeamModal } from "../components/team/ImportTeamModal";
import { DeleteTeamConfirmModal } from "../components/team/DeleteTeamConfirmModal";

export function MyTeams() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { regulations } = useRegulationCatalog();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.teams.list,
    queryFn: () => ipc.listTeams(),
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await ipc.deleteTeam(pendingDelete.id);
      await qc.invalidateQueries({ queryKey: queryKeys.teams.list });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const duplicate = async (team: NonNullable<typeof data>[number]) => {
    if (!team.id) return;
    const { id: _id, created_at: _created, updated_at: _updated, ...rest } = team;
    const copy = {
      ...rest,
      id: null,
      name: t("my_teams.copy_name", { name: team.name }),
      created_at: null,
      updated_at: null,
    };
    const newId = await ipc.saveTeam(copy);
    await qc.invalidateQueries({ queryKey: queryKeys.teams.list });
    setCopiedId(newId);
    window.setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("my_teams.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="btn-ghost text-xs"
            title={t("my_teams.import_title")}
          >
            <Upload size={14} className="mr-1 inline" />
            {t("my_teams.import")}
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            disabled={!data || data.length === 0}
            className="btn-ghost text-xs disabled:cursor-not-allowed disabled:opacity-50"
            title={t("my_teams.export_title")}
          >
            <Download size={14} className="mr-1 inline" />
            {t("my_teams.export")}
          </button>
          <Link to="/team-builder" className="btn-primary">
            <Plus size={14} className="mr-1" />
            {t("common.new")}
          </Link>
        </div>
      </header>
      {exportOpen && data && (
        <ExportTeamsModal teams={data} onClose={() => setExportOpen(false)} />
      )}
      {importOpen && <ImportTeamModal onClose={() => setImportOpen(false)} />}
      <DeleteTeamConfirmModal
        teamName={pendingDelete?.name ?? null}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
      {copiedId !== null && (
        <div
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--success)",
            color: "var(--success)",
            backgroundColor: "color-mix(in srgb, var(--success) 8%, transparent)",
          }}
        >
          {t("my_teams.duplicated")}
        </div>
      )}

      {isLoading && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("common.loading")}
        </div>
      )}
      {data && data.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("my_teams.empty")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((team) => {
          const members: MiniTeamMember[] = team.members
            .filter((m) => m.species.trim() !== "")
            .map((m) => ({
              species: m.species,
              sprite_url: spriteFor(m.species),
              item: m.item,
              ability: m.ability,
              tera_type: m.tera_type,
              nature: m.nature,
              moves: m.moves,
            }));
          return (
            <div key={team.id ?? team.name} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-semibold"
                    title={team.name}
                    style={{ color: "var(--text)" }}
                  >
                    {team.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {regulationBadge(team.format, t, regulations)}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        backgroundColor: "var(--bg-elev-strong)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date().getFullYear()}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor:
                          team.build_mode === "champions"
                            ? "var(--accent-soft)"
                            : "var(--bg-elev-strong)",
                        color:
                          team.build_mode === "champions"
                            ? "var(--accent)"
                            : "var(--text-muted)",
                      }}
                    >
                      {team.build_mode === "champions"
                        ? t("team_builder.champions")
                        : t("team_builder.classic")}
                    </span>
                  </div>
                  {team.notes && team.notes.trim() !== "" ? (
                    <p
                      className="mt-2 line-clamp-2 text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {team.notes}
                    </p>
                  ) : (
                    <p
                      className="mt-2 text-[11px] italic"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("my_teams.no_notes")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Link
                    to={`/team-builder/${team.id}`}
                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
                    title={t("common.edit")}
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void duplicate(team)}
                    disabled={!team.id}
                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--accent)] disabled:opacity-30"
                    title={t("my_teams.duplicate")}
                    aria-label={t("my_teams.duplicate")}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      team.id &&
                      setPendingDelete({ id: team.id, name: team.name })
                    }
                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--danger)]"
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <MiniTeam members={members} cols={3} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Showdown gen5 sprite URL for a saved team member.
 *
 * The previous version stripped every hyphen, so `Calyrex-Ice-Rider` became
 * `calyrexicerider.png` and 404'd for every hyphenated forme. The CDN keeps
 * ONE hyphen between the base species and the forme id
 * (`calyrex-icerider`, `rotom-wash`, `indeedee-f`), which is the same rule
 * `sprite_resolver::primary_slug` applies on the Rust side.
 *
 * `PokemonSprite` still owns the fallback chain, so a miss degrades to the HD
 * render and then to the placeholder rather than to a broken image.
 */
function spriteFor(species: string): string {
  const id = (part: string) => part.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const [base, ...forme] = species.split("-");
  const slug = forme.length > 0 ? `${id(base)}-${id(forme.join(""))}` : id(base);
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}

function regulationBadge(
  format: string,
  t: TFunction,
  regulations: RegulationInfo[],
): string {
  const info = regulations.find((r) => r.id === format);
  return info ? regulationLabel(t, info) : format;
}
