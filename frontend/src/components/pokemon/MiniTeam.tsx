import { useTranslation } from "react-i18next";
import { PokemonSprite } from "./PokemonSprite";
import { useLocalize } from "../../hooks/useTranslations";

export interface MiniTeamMember {
  species: string;
  sprite_url: string;
  item?: string | null;
  ability?: string | null;
  tera_type?: string | null;
  moves?: string[];
}

interface Props {
  members: MiniTeamMember[];
  cols?: 3 | 6;
  size?: number;
}

export function MiniTeam({ members, cols = 3, size = 48 }: Props) {
  const { t } = useTranslation();
  const localize = useLocalize();

  const buildTooltip = (m: MiniTeamMember): string => {
    const parts: string[] = [m.species];
    if (m.item) parts.push(`${t("top_teams.item")}: ${localize("item", m.item)}`);
    if (m.ability)
      parts.push(`${t("top_teams.ability")}: ${localize("ability", m.ability)}`);
    if (m.tera_type) parts.push(`${t("top_teams.tera_type")}: ${m.tera_type}`);
    if (m.moves && m.moves.length > 0) {
      const mv = m.moves.map((x) => localize("move", x)).join(", ");
      parts.push(`${t("top_teams.moves")}: ${mv}`);
    }
    return parts.join("\n");
  };

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
          <div
            key={i}
            className="flex items-center justify-center"
            title={buildTooltip(m)}
          >
            <PokemonSprite url={m.sprite_url} name={m.species} size={size} />
          </div>
        ) : (
          <div key={i} className="h-[60px]" />
        );
      })}
    </div>
  );
}
