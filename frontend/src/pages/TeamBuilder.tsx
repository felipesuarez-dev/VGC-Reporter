import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { ipc, AppError } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { useTeamBuilder } from "../stores/teamBuilderStore";
import { TeamMemberForm } from "../components/team/TeamMemberForm";

export function TeamBuilder() {
  const { id } = useParams();
  const teamId = id ? Number(id) : null;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { team, setTeam, setName, setNotes, setMember, reset } = useTeamBuilder();
  const [status, setStatus] = useState<string | null>(null);

  const { data: pokedex = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
  });

  const { data: items = [] } = useQuery({
    queryKey: queryKeys.items.all,
    queryFn: () => ipc.listItems(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: moves = [] } = useQuery({
    queryKey: queryKeys.moves.all,
    queryFn: () => ipc.listMoves(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const { data: loaded } = useQuery({
    queryKey: queryKeys.teams.detail(teamId ?? -1),
    queryFn: () => ipc.getTeam(teamId as number),
    enabled: teamId !== null,
  });

  useEffect(() => {
    if (teamId === null) {
      reset();
    } else if (loaded) {
      setTeam(loaded);
    }
  }, [teamId, loaded, reset, setTeam]);

  const save = async () => {
    try {
      setStatus(null);
      const newId = await ipc.saveTeam(team);
      await qc.invalidateQueries({ queryKey: queryKeys.teams.list });
      setStatus(t("team_builder.saved"));
      if (teamId === null) navigate(`/team-builder/${newId}`);
    } catch (e) {
      setStatus(e instanceof AppError ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("team_builder.title")}</h1>
        <button className="btn-primary" onClick={save} disabled={!team.name.trim()}>
          <Save size={14} className="mr-1" />
          {t("common.save")}
        </button>
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
            value="regulation-m-a"
            disabled
            title={t("team_builder.regulation_hint")}
          >
            <option value="regulation-m-a">Regulation M-A</option>
          </select>
          <p className="mt-1 text-[10px] text-slate-500">
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
    </div>
  );
}
