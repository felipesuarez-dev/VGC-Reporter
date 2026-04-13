import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Plus } from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { MiniTeam, type MiniTeamMember } from "../components/pokemon/MiniTeam";

export function MyTeams() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.teams.list,
    queryFn: () => ipc.listTeams(),
  });

  const remove = async (id: number) => {
    await ipc.deleteTeam(id);
    qc.invalidateQueries({ queryKey: queryKeys.teams.list });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("my_teams.title")}</h1>
        <Link to="/team-builder" className="btn-primary">
          <Plus size={14} className="mr-1" />
          {t("common.new")}
        </Link>
      </header>

      {isLoading && <div className="card text-slate-400">{t("common.loading")}</div>}
      {data && data.length === 0 && (
        <div className="card text-slate-400">{t("my_teams.empty")}</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((team) => {
          const members: MiniTeamMember[] = team.members
            .filter((m) => m.species.trim() !== "")
            .map((m) => ({ species: m.species, sprite_url: spriteFor(m.species) }));
          return (
            <div key={team.id ?? team.name} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{team.name}</div>
                  <div className="text-[11px] text-slate-500">{team.format}</div>
                </div>
                <div className="flex gap-1">
                  <Link
                    to={`/team-builder/${team.id}`}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    title={t("common.edit")}
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => team.id && remove(team.id)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                    title={t("common.delete")}
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

function spriteFor(species: string): string {
  const slug = species.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`;
}
