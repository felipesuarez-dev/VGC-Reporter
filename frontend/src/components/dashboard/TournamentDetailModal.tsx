import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  ExternalLink,
  Globe2,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UpcomingTournament } from "../../lib/types";
import { countryFlag, countryName } from "../../lib/countries";
import { downloadIcs } from "../../lib/calendar";
import { formatDate } from "../../lib/formatDate";
import { openExternal } from "../../lib/openExternal";
import { sanitizeAddress } from "../../lib/upcoming";
import { useOfficialEventDetails } from "../../hooks/useOfficialEventDetails";
import { useModalBack } from "../../hooks/useModalBack";
import { EventSourceBadge } from "./EventSourceBadge";

interface Props {
  event: UpcomingTournament | null;
  onClose: () => void;
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: "var(--bg-elev-strong)",
          color: "var(--text-dim)",
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div
          className="text-[9px] uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
        </div>
        <div className="text-xs" style={{ color: "var(--text)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * In-app event preview with everything an attending player needs: venue,
 * full address, contact, admission, registration window, an OpenStreetMap
 * embed, and the official page. "Open in browser" remains the fallback.
 */
export function TournamentDetailModal({ event, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [pageLoaded, setPageLoaded] = useState(false);
  const officialQuery = useOfficialEventDetails(
    event?.url ?? "",
    Boolean(
      event &&
        event.source === "play-pokemon" &&
        event.url.includes("play-pokemon-tournaments"),
    ),
  );

  useModalBack(Boolean(event), onClose);

  useEffect(() => {
    if (!event) return;
    setPageLoaded(false);
    const handler = (keyboard: KeyboardEvent) => {
      if (keyboard.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [event, onClose]);

  if (!event) return null;

  const sourceLabel =
    event.source === "play-pokemon"
      ? t("upcoming.source_official")
      : t("upcoming.source_limitless");
  const official = officialQuery.data;
  const officialAddress = [
    official?.address_line1,
    official?.address_line2,
    official?.city,
    official?.state,
    official?.postal_code,
    official?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const address = sanitizeAddress(
    event.street_address
      ? event.street_address
      : officialAddress ||
          [
            event.city,
            event.state,
            event.postal_code,
            event.country
              ? `${countryFlag(event.country)} ${countryName(
                  event.country,
                  i18n.language,
                )}`
              : null,
          ]
            .filter(Boolean)
            .join(", "),
  );
  const venue = event.venue ?? official?.venue ?? null;
  const contactEmail = event.contact_email ?? official?.organizer_email ?? null;
  const contactPhone = event.contact_phone ?? official?.organizer_phone ?? null;
  const organizer = official?.organizer_name ?? null;
  const organizerWebsite = event.event_website ?? official?.website ?? null;
  const postalCode = event.postal_code ?? official?.postal_code ?? null;
  const officialId =
    official?.tournament_id ??
    event.url.match(/play-pokemon-tournaments\/([^/?#]+)/)?.[1] ??
    null;
  const admission = event.admission ?? official?.admission ?? null;
  const registration =
    event.registration_start || event.registration_end
      ? [event.registration_start, event.registration_end]
          .filter(Boolean)
          .join(" → ")
      : (official?.registration ?? null);
  const details = event.details ?? official?.details ?? null;
  const latitude = event.latitude ?? official?.latitude ?? null;
  const longitude = event.longitude ?? official?.longitude ?? null;
  const mapQuery =
    latitude != null && longitude != null ? `${latitude},${longitude}` : address;
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        mapQuery,
      )}`
    : null;
  const mapEmbed =
    latitude != null && longitude != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${
          longitude - 0.008
        },${latitude - 0.006},${longitude + 0.008},${
          latitude + 0.006
        }&layer=mapnik&marker=${latitude},${longitude}`
      : null;
  const time = event.time ? event.time.slice(0, 5) : null;
  const fullDate = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${event.date}T12:00:00`));
  // Every event has at least date/time/type/source, so the info panel is
  // always useful; individual rows disappear when the organizer did not
  // publish them.
  const hasDetails = true;

  const canPreview = event.source !== "play-pokemon";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={event.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl ${
          canPreview ? "h-[93vh]" : "max-h-[93vh]"
        }`}
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(click) => click.stopPropagation()}
      >
        <header
          className="relative flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3 pr-12 sm:flex-nowrap"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[9px] uppercase tracking-wide"
                style={{ color: "var(--text-dim)" }}
              >
                {event.kind ?? t("upcoming.title")}
              </span>
              <EventSourceBadge source={event.source} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2
                className="line-clamp-2 text-base font-semibold"
                style={{ color: "var(--text)" }}
              >
                {event.name}
              </h2>
              {admission && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    borderColor: "var(--accent)",
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                  title={t("upcoming.admission")}
                >
                  <Ticket size={12} />
                  {admission}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {formatDate(event.date, i18n.language)}
              {time ? ` · ${time}` : ""}
              {event.city ? ` · ${event.city}` : ""}
              {event.players != null
                ? ` · ${event.players} ${t("dashboard.players")}`
                : ""}
              {event.region ? ` · ${event.region}` : ""}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-start gap-1 sm:w-auto sm:shrink-0 sm:justify-end">
            {organizerWebsite && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => openExternal(organizerWebsite)}
                title={t("upcoming.website")}
                aria-label={t("upcoming.website")}
              >
                <Globe2 size={13} className="sm:mr-1" />
                <span className="hidden sm:inline">
                  {t("upcoming.website_short")}
                </span>
              </button>
            )}
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => downloadIcs(event, sourceLabel)}
              title={t("upcoming.export_ics")}
              aria-label={t("upcoming.export_ics")}
            >
              <CalendarPlus size={13} className="sm:mr-1" />
              <span className="hidden sm:inline">{t("upcoming.export_ics")}</span>
            </button>
            {mapUrl && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => openExternal(mapUrl)}
                title={t("upcoming.open_map")}
                aria-label={t("upcoming.open_map")}
              >
                <MapPin size={13} className="sm:mr-1" />
                <span className="hidden sm:inline">{t("upcoming.open_map")}</span>
              </button>
            )}
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => openExternal(event.url)}
              title={t("feed.open_in_browser")}
              aria-label={t("feed.open_in_browser")}
            >
              <ExternalLink size={13} className="sm:mr-1" />
              <span className="hidden sm:inline">
                {t("feed.open_in_browser")}
              </span>
            </button>
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--text-muted)" }}
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasDetails && (
            <div className="grid gap-x-6 gap-y-2 px-4 py-3 md:grid-cols-2">
              <div className="space-y-2">
                <Detail
                  icon={<CalendarPlus size={12} />}
                  label={t("upcoming.date_time")}
                >
                  {fullDate}
                  {time ? ` · ${time}` : ""}
                </Detail>
                <Detail icon={<Info size={12} />} label={t("upcoming.type")}>
                  {event.kind ?? sourceLabel}
                </Detail>
                {event.region && (
                  <Detail icon={<Info size={12} />} label={t("upcoming.format")}>
                    {event.region}
                  </Detail>
                )}
                <Detail icon={<Info size={12} />} label={t("upcoming.source")}>
                  <EventSourceBadge source={event.source} />
                </Detail>
                {event.players != null && (
                  <Detail icon={<Info size={12} />} label={t("dashboard.players")}>
                    {event.players}
                  </Detail>
                )}
                {(event.city || event.country) && (
                  <Detail
                    icon={<MapPin size={12} />}
                    label={t("upcoming.city_country")}
                  >
                    {event.city ?? "—"}
                    {event.country
                      ? ` · ${countryName(event.country, i18n.language)}`
                      : ""}
                  </Detail>
                )}
                {venue && (
                  <Detail icon={<MapPin size={12} />} label={t("upcoming.venue")}>
                    {venue}
                  </Detail>
                )}
                {address && (
                  <Detail icon={<MapPin size={12} />} label={t("upcoming.address")}>
                    {address}
                  </Detail>
                )}
                {postalCode && (
                  <Detail
                    icon={<MapPin size={12} />}
                    label={t("upcoming.postal_code")}
                  >
                    {postalCode}
                  </Detail>
                )}
              </div>
              <div className="space-y-2">
                {admission && (
                  <Detail
                    icon={<Ticket size={12} />}
                    label={t("upcoming.admission")}
                  >
                    <span data-testid="event-price">{admission}</span>
                  </Detail>
                )}
                {organizer && (
                  <Detail
                    icon={<UserRound size={12} />}
                    label={t("upcoming.organizer")}
                  >
                    {organizer}
                  </Detail>
                )}
                {(contactEmail || contactPhone) && (
                  <Detail icon={<Mail size={12} />} label={t("upcoming.contact")}>
                    <div className="flex flex-wrap gap-2">
                      {contactEmail && (
                        <button
                          type="button"
                          className="underline decoration-dotted"
                          onClick={() => openExternal(`mailto:${contactEmail}`, "mail")}
                        >
                          {contactEmail}
                        </button>
                      )}
                      {contactPhone && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 underline decoration-dotted"
                          onClick={() => openExternal(`tel:${contactPhone}`, "phone")}
                        >
                          <Phone size={10} />
                          {contactPhone}
                        </button>
                      )}
                    </div>
                  </Detail>
                )}
                {registration && (
                  <Detail
                    icon={<Info size={12} />}
                    label={t("upcoming.registration")}
                  >
                    {registration}
                  </Detail>
                )}
                {official?.category && (
                  <Detail icon={<Info size={12} />} label={t("upcoming.category")}>
                    {official.category}
                  </Detail>
                )}
                {official?.premier_event && (
                  <Detail
                    icon={<Info size={12} />}
                    label={t("upcoming.premier_event")}
                  >
                    {official.premier_event}
                  </Detail>
                )}
                {official?.status && (
                  <Detail icon={<Info size={12} />} label={t("upcoming.status")}>
                    {official.status}
                  </Detail>
                )}
                {officialId && (
                  <Detail
                    icon={<Info size={12} />}
                    label={t("upcoming.tournament_id")}
                  >
                    {officialId}
                  </Detail>
                )}
                {event.third_party_registration_website && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() =>
                      openExternal(event.third_party_registration_website!)
                    }
                  >
                    <ExternalLink size={12} className="mr-1" />
                    {t("upcoming.registration_link")}
                  </button>
                )}
              </div>
            </div>
          )}

          {details && (
            <div className="px-4 pb-3">
              <Detail icon={<Info size={12} />} label={t("upcoming.details")}>
                {details}
              </Detail>
            </div>
          )}

          {officialQuery.isLoading && (
            <div
              className="flex items-center gap-2 px-4 pb-3 text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              <Loader2 size={12} className="animate-spin" />
              {t("upcoming.official_loading")}
            </div>
          )}

          {mapEmbed && (
            <div className="px-4 pb-3">
              <div
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <iframe
                  src={mapEmbed}
                  title={t("upcoming.map")}
                  className="h-56 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {canPreview && (
            <div className="px-4 pb-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("upcoming.official_page")}
                </h3>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {sourceLabel}
                </span>
              </div>
              <div
                className="relative h-[42vh] min-h-[260px] overflow-hidden rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg)",
                }}
              >
                {!pageLoaded && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    style={{ color: "var(--text-dim)" }}
                  >
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                )}
                <iframe
                  src={event.url}
                  title={event.name}
                  className="h-full w-full"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => setPageLoaded(true)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
