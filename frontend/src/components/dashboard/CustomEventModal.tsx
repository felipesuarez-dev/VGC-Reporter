import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus, X } from "lucide-react";
import { useCustomEventsStore } from "../../stores/customEventsStore";
import { useModalBack } from "../../hooks/useModalBack";

interface Props {
  date: string;
  onClose: () => void;
}

/** Personal event that only lives in the app calendar. */
export function CustomEventModal({ date, onClose }: Props) {
  const { t } = useTranslation();
  const addEvent = useCustomEventsStore((s) => s.addEvent);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(date);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useModalBack(true, onClose);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const save = () => {
    if (!title.trim() || !eventDate) return;
    addEvent({
      title,
      date: eventDate,
      time: time || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("calendar.custom_event")}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="flex items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="flex items-center gap-2 text-base font-semibold"
            style={{ color: "var(--text)" }}
          >
            <CalendarPlus size={16} style={{ color: "var(--accent)" }} />
            {t("calendar.custom_event")}
          </h2>
          <button
            type="button"
            className="btn-ghost h-8 w-8 p-0"
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-3 overflow-y-auto p-4">
          <label className="block">
            <span className="label">{t("calendar.event_title")}</span>
            <input
              className="input w-full"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              maxLength={120}
              placeholder={t("calendar.event_title_placeholder")}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t("calendar.event_date")}</span>
              <input
                type="date"
                className="input w-full"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">{t("calendar.event_time")}</span>
              <input
                type="time"
                className="input w-full"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <span className="label">{t("calendar.event_location")}</span>
            <input
              className="input w-full"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={200}
            />
          </label>
          <label className="block">
            <span className="label">{t("calendar.event_notes")}</span>
            <textarea
              className="input min-h-20 w-full resize-y"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
            />
          </label>
        </div>

        <footer
          className="flex justify-end gap-2 border-t px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={save}
            disabled={!title.trim() || !eventDate}
          >
            {t("calendar.save_event")}
          </button>
        </footer>
      </div>
    </div>
  );
}
