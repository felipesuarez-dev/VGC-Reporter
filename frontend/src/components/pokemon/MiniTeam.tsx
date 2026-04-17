import { useTranslation } from "react-i18next";
import { PokemonSprite } from "./PokemonSprite";
import { useLocalize } from "../../hooks/useTranslations";

export interface MiniTeamMember {
  species: string;
  sprite_url: string;
  item?: string | null;
  ability?: string | null;
  tera_type?: string | null;
  nature?: string | null;
  moves?: string[];
}

interface Props {
  members: MiniTeamMember[];
  cols?: 3 | 6;
  size?: number;
}

export function MiniTeam({ members, cols = 3, size = 48 }: Props) {
  return (
    <div
      className="grid gap-1 rounded-lg border p-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => {
        const m = members[i];
        return m ? (
          <SpriteCell key={i} member={m} size={size} />
        ) : (
          <div key={i} className="h-[60px]" />
        );
      })}
    </div>
  );
}

function SpriteCell({ member, size }: { member: MiniTeamMember; size: number }) {
  const { t } = useTranslation();
  const localize = useLocalize();

  const lines: Array<{ label: string; value: string }> = [];
  if (member.item) {
    lines.push({
      label: t("top_teams.item"),
      value: localize("item", member.item),
    });
  }
  if (member.ability) {
    lines.push({
      label: t("top_teams.ability"),
      value: localize("ability", member.ability),
    });
  }
  if (member.nature) {
    lines.push({
      label: t("team_builder.nature"),
      value: t(`natures.${member.nature}`, { defaultValue: member.nature }),
    });
  }
  if (member.tera_type) {
    lines.push({
      label: t("top_teams.tera_type"),
      value: t(`types.${member.tera_type}`, { defaultValue: member.tera_type }),
    });
  }
  const moves = (member.moves ?? []).filter(Boolean);

  return (
    <div className="group relative flex items-center justify-center">
      <PokemonSprite url={member.sprite_url} name={member.species} size={size} />
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 bottom-full z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 whitespace-normal rounded-md border px-2 py-1.5 text-[11px] leading-snug opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
        style={{
          backgroundColor: "var(--bg-elev-strong)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        <div className="mb-1 font-semibold">{member.species}</div>
        {lines.length > 0 && (
          <ul className="space-y-0.5">
            {lines.map((line) => (
              <li key={line.label}>
                <span style={{ color: "var(--text-dim)" }}>{line.label}:</span>{" "}
                <span style={{ color: "var(--text)" }}>{line.value}</span>
              </li>
            ))}
          </ul>
        )}
        {moves.length > 0 && (
          <>
            <div
              className="mt-1 text-[10px] uppercase tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              {t("top_teams.moves")}
            </div>
            <ul className="mt-0.5">
              {moves.map((mv) => (
                <li key={mv} style={{ color: "var(--text)" }}>
                  • {localize("move", mv)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
