import { PokemonSprite } from "./PokemonSprite";

export interface MiniTeamMember {
  species: string;
  sprite_url: string;
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
          <div key={i} className="flex flex-col items-center">
            <PokemonSprite url={m.sprite_url} name={m.species} size={size} />
            <span
              className="max-w-full truncate text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              {m.species}
            </span>
          </div>
        ) : (
          <div key={i} className="h-[60px]" />
        );
      })}
    </div>
  );
}
