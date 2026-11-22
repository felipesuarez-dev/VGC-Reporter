import { useTranslation } from "react-i18next";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import type { EntityUser } from "../../lib/entityUsers";

/** Compact "most used by" row shared by item/move/ability cards. */
export function EntityUsers({
  users,
  className = "",
}: {
  users: EntityUser[];
  className?: string;
}) {
  const { t } = useTranslation();
  if (users.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {users.map((user) => (
        <span
          key={user.species}
          className="inline-flex min-w-0 items-center gap-1 rounded-full border px-1 py-0.5 text-[9px]"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
          title={t("dashboard.entity_user_share_hint", {
            name: user.species,
            share: user.sharePercent.toFixed(1),
            percent: user.usagePercent.toFixed(1),
          })}
        >
          <PokemonSprite
            url={user.spriteUrl}
            fallbackUrl={user.fallbackUrl}
            homeUrl={user.homeUrl}
            name={user.species}
            size={14}
            variant="pixel"
          />
          <span className="max-w-[4.5rem] truncate">{user.species}</span>
          <span
            className="shrink-0 tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            {user.sharePercent.toFixed(1)}%
          </span>
        </span>
      ))}
    </div>
  );
}
