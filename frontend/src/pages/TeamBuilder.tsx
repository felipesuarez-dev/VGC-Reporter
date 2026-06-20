import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardCopy,
  ClipboardPaste,
  Save,
  X,
} from "lucide-react";
import { ipc, AppError } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { Violation } from "../lib/types";
import { canonicalSpeciesId, isAllowedName } from "../lib/types";
import { useTeamBuilder } from "../stores/teamBuilderStore";
import { TeamMemberForm } from "../components/team/TeamMemberForm";
import { ImportCompletionModal } from "../components/team/ImportCompletionModal";
import { ValidationModal } from "../components/team/ValidationModal";

export function TeamBuilder() {
  const { id } = useParams();
  const teamId = id ? Number(id) : null;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { team, setTeam, setName, setNotes, setMember, reset } =
    useTeamBuilder();
  const [status, setStatus] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[] | null>(null);
  const [importMissing, setImportMissing] = useState<string[] | null>(null);

  const { data: pokedexAll = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
  });

  const { data: itemsAll = [] } = useQuery({
    queryKey: queryKeys.items.all,
    queryFn: () => ipc.listItems(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: movesAll = [] } = useQuery({
    queryKey: queryKeys.moves.all,
    queryFn: () => ipc.listMoves(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: allowedSpeciesList = [] } = useQuery({
    queryKey: queryKeys.allowedSpecies(team.format),
    queryFn: () => ipc.getAllowedSpecies(team.format),
    staleTime: Infinity,
  });
  const { data: allowedItemsList = [] } = useQuery({
    queryKey: queryKeys.allowedItems(team.format),
    queryFn: () => ipc.getAllowedItems(team.format),
    staleTime: Infinity,
  });
  const { data: allowedMovesList = [] } = useQuery({
    queryKey: queryKeys.allowedMoves(team.format),
    queryFn: () => ipc.getAllowedMoves(team.format),
    staleTime: Infinity,
  });

  const allowedSpeciesKeys = useMemo(
    () => new Set(allowedSpeciesList.map((s) => canonicalSpeciesId(s))),
    [allowedSpeciesList],
  );
  const allowedItemsKeys = useMemo(
    () => new Set(allowedItemsList.map((s) => canonicalSpeciesId(s))),
    [allowedItemsList],
  );
  const allowedMovesKeys = useMemo(
    () => new Set(allowedMovesList.map((s) => canonicalSpeciesId(s))),
    [allowedMovesList],
  );

  const pokedex = useMemo(
    () => pokedexAll.filter((p) => isAllowedName(p.name, allowedSpeciesKeys)),
    [pokedexAll, allowedSpeciesKeys],
  );
  const items = useMemo(
    () => itemsAll.filter((it) => isAllowedName(it, allowedItemsKeys)),
    [itemsAll, allowedItemsKeys],
  );
  const moves = useMemo(
    () => movesAll.filter((mv) => isAllowedName(mv, allowedMovesKeys)),
    [movesAll, allowedMovesKeys],
  );

  const { data: loaded } = useQuery({
    queryKey: queryKeys.teams.detail(teamId ?? -1),
    queryFn: () => ipc.getTeam(teamId as number),
    enabled: teamId !== null,
  });

  useEffect(() => {
    if (teamId !== null && loaded) setTeam(loaded);
  }, [teamId, loaded, setTeam]);

  // StrictMode dev-mode runs mount effects as setup → cleanup → setup. Without
  // this latch the second setup saw pendingImport already cleared and called
  // reset(), wiping the just-applied draft. The ref persists across the double
  // setup within the same instance, so the import runs exactly once per mount.
  const importConsumedRef = useRef(false);
  useEffect(() => {
    if (teamId !== null) return;
    if (importConsumedRef.current) return;
    importConsumedRef.current = true;
    const state = useTeamBuilder.getState();
    if (state.pendingImport) {
      setTeam(state.pendingImport);
      state.clearPendingImport();
      const missing = state.consumePendingImportMissing();
      if (missing.length > 0) setImportMissing(missing);
    } else {
      reset();
    }
  }, [teamId, setTeam, reset]);

  const save = async () => {
    try {
      setStatus(null);
      const issues = await ipc.validateTeam(team, team.format);
      if (issues.length > 0) {
        setViolations(issues);
        return;
      }
      setViolations(null);
      const newId = await ipc.saveTeam(team);
      await qc.invalidateQueries({ queryKey: queryKeys.teams.list });
      setStatus(t("team_builder.saved"));
      if (teamId === null) navigate(`/team-builder/${newId}`);
    } catch (e) {
      setStatus(e instanceof AppError ? e.message : String(e));
    }
  };

  const handleImport = async () => {
    try {
      setImportError(null);
      const imported = await ipc.importShowdownText(importText);
      imported.name = team.name || imported.name;
      imported.notes = team.notes;
      setTeam(imported);
      setImportOpen(false);
      setImportText("");
      setStatus(t("team_builder.imported"));
    } catch (e) {
      setImportError(
        e instanceof AppError ? e.message : t("team_builder.import_failed"),
      );
    }
  };

  const handleCopyShowdown = async () => {
    try {
      const text = await ipc.exportTeamToShowdown(team);
      await navigator.clipboard.writeText(text);
      setStatus(t("team_builder.copied"));
    } catch (e) {
      setStatus(e instanceof AppError ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("team_builder.title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => setImportOpen(true)}>
            <ClipboardPaste size={14} className="mr-1" />
            {t("team_builder.import_showdown")}
          </button>
          <button className="btn-ghost" onClick={handleCopyShowdown}>
            <ClipboardCopy size={14} className="mr-1" />
            {t("team_builder.copy_showdown")}
          </button>
          <button className="btn-primary" onClick={save} disabled={!team.name.trim()}>
            <Save size={14} className="mr-1" />
            {t("common.save")}
          </button>
        </div>
      </header>

      <div className="card grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">{t("team_builder.team_name")}</label>
          <input
            className="input mt-1"
            value={team.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("team_builder.regulation")}</label>
          <select
            className="input mt-1 cursor-not-allowed opacity-70"
            value="regulation-m-b"
            disabled
            title={t("team_builder.regulation_hint")}
          >
            <option value="regulation-m-b">Regulation M-B (M-3)</option>
          </select>
          <p className="mt-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("team_builder.regulation_hint")}
          </p>
        </div>
        <div>
          <label className="label">{t("team_builder.notes")}</label>
          <input
            className="input mt-1"
            value={team.notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {status && <div className="card text-xs text-brand-300">{status}</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {team.members.map((m, i) => (
          <TeamMemberForm
            key={i}
            slot={i}
            value={m}
            pokedex={pokedex}
            items={items}
            moves={moves}
            onChange={(next) => setMember(i, next)}
          />
        ))}
      </div>

      <ImportCompletionModal
        open={importMissing !== null}
        missing={importMissing ?? []}
        onClose={() => setImportMissing(null)}
      />

      <ValidationModal
        open={violations !== null && violations.length > 0}
        violations={violations ?? []}
        onClose={() => setViolations(null)}
      />

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setImportOpen(false)}
        >
          <div
            className="card w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                {t("team_builder.import_showdown")}
              </h2>
              <button
                className="btn-ghost"
                onClick={() => setImportOpen(false)}
                aria-label="close"
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              className="input h-64 w-full font-mono text-xs"
              placeholder={t("team_builder.paste_here")}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            {importError && (
              <p className="mt-2 text-xs text-red-400">{importError}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setImportOpen(false)}>
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                {t("team_builder.import")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
