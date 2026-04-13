import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { Format } from "../lib/types";
import { MiniTeam } from "../components/pokemon/MiniTeam";

const FORMAT: Format = "regulation-m-a";

export function TopTeams() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.topTeams(FORMAT),
    queryFn: () => ipc.getTopTeams(FORMAT, 20),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("top_teams.title")}</h1>
      </header>

      {isLoading && <div className="card text-slate-400">{t("common.loading")}</div>}
      {isError && <div className="card text-red-400">{t("common.error")}</div>}
      {data && data.length === 0 && (
        <div className="card text-slate-400">{t("common.empty")}</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((tt, idx) => (
          <div key={`${tt.tournament}-${idx}`} className="card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {tt.player ?? "—"}
                </div>
                <div className="text-[11px] text-slate-500">{tt.tournament}</div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                {tt.placing != null && (
                  <div>
                    {t("top_teams.placing")}: #{tt.placing}
                  </div>
                )}
                {tt.record && (
                  <div>
                    {t("top_teams.record")}: {tt.record}
                  </div>
                )}
              </div>
            </div>
            <MiniTeam
              members={tt.members.map((m) => ({
                species: m.species,
                sprite_url: m.sprite_url,
              }))}
              cols={6}
              size={40}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
