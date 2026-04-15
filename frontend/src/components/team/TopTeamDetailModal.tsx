import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { TopTeam } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { useLocalize } from "../../hooks/useTranslations";

interface Props {
  team: TopTeam | null;
  onClose: () => void;
}

export function TopTeamDetailModal({ team, onClose }: Props) {
  const { t } = useTranslation();
  const localize = useLocalize();

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border p-5 shadow-2xl"
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

        <header className="mb-4">
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
        </header>

        {!hasRichInfo && (
          <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
            {t("top_teams.limited_info")}
          </p>
        )}

        <section
          aria-label={t("top_teams.members")}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
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
                <PokemonSprite url={m.sprite_url} name={m.species} size={64} />
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
                        {localize("item", m.item)}
                      </div>
                    )}
                    {m.ability && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>
                          {t("top_teams.ability")}:
                        </span>{" "}
                        {localize("ability", m.ability)}
                      </div>
                    )}
                    {m.tera_type && (
                      <div style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: "var(--text-dim)" }}>
                          {t("top_teams.tera_type")}:
                        </span>{" "}
                        {m.tera_type}
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
                  <ul className="mt-1 grid grid-cols-2 gap-x-2 text-[11px]">
                    {m.moves.map((mv, j) => (
                      <li key={j} style={{ color: "var(--text)" }}>
                        • {localize("move", mv)}
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
