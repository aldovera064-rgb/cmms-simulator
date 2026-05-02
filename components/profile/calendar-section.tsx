"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import { supabase } from "@/lib/supabase";

type CalendarSectionProps = {
  userId: string;
  canEdit: boolean;
  locale: "es" | "en";
};

type UserEvent = {
  id: string;
  date: string;
  type: string;
  note: string;
};

const EVENT_TYPES = [
  { value: "vacaciones", label: "Vacaciones", labelEn: "Vacation", color: "#3b82f6", bg: "bg-blue-500" },
  { value: "descanso", label: "Descanso", labelEn: "Day off", color: "#22c55e", bg: "bg-green-500" },
  { value: "incapacidad", label: "Incapacidad", labelEn: "Sick leave", color: "#f97316", bg: "bg-orange-500" },
  { value: "custom", label: "Personalizado", labelEn: "Custom", color: "#8b5cf6", bg: "bg-purple-500" }
];

const DAY_NAMES_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: formatISODate(d), day: d.getDate(), isCurrentMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({ date: formatISODate(date), day: d, isCurrentMonth: true });
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    days.push({ date: formatISODate(date), day: d, isCurrentMonth: false });
  }

  return days;
}

function formatISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarSection({ userId, canEdit, locale }: CalendarSectionProps) {
  const { showToast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newType, setNewType] = useState("vacaciones");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const dayNames = locale === "en" ? DAY_NAMES_EN : DAY_NAMES_ES;
  const monthNames = locale === "en" ? MONTH_NAMES_EN : MONTH_NAMES_ES;
  const days = getMonthDays(year, month);
  const todayStr = formatISODate(new Date());

  const copy = locale === "en"
    ? { title: "Calendar", addEvent: "Add event", type: "Type", note: "Note (optional)", save: "Save", delete: "Delete", noEvents: "No events", cancel: "Cancel", insertError: "Error adding event" }
    : { title: "Agenda", addEvent: "Agregar evento", type: "Tipo", note: "Nota (opcional)", save: "Guardar", delete: "Eliminar", noEvents: "Sin eventos", cancel: "Cancelar", insertError: "Error al agregar evento" };

  // ── LOAD events from DB ──
  useEffect(() => {
    const load = async () => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endMonth = month === 11 ? 0 : month + 1;
      const endYear = month === 11 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("user_events")
        .select("id, date, type, note")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lt("date", endDate);

      if (error) {
        console.error("CALENDAR LOAD ERROR:", error);
      }

      setEvents(
        (data ?? []).map((row) => ({
          id: row.id as string,
          date: row.date as string,
          type: row.type as string,
          note: (row.note as string) ?? ""
        }))
      );
    };

    void load();
  }, [userId, year, month]);

  // ── Build a map: date -> events for fast lookup ──
  const eventsByDate = new Map<string, UserEvent[]>();
  for (const evt of events) {
    const list = eventsByDate.get(evt.date) ?? [];
    list.push(evt);
    eventsByDate.set(evt.date, list);
  }

  const eventsForDate = (date: string) => eventsByDate.get(date) ?? [];

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    if (canEdit) {
      setAddModalOpen(true);
      setNewType("vacaciones");
      setNewNote("");
    }
  };

  // ── INSERT event with error handling and full reload ──
  const handleAddEvent = async () => {
    if (!selectedDate || !canEdit) return;
    setSaving(true);

    const { data: inserted, error } = await supabase
      .from("user_events")
      .insert({
        user_id: userId,
        date: selectedDate,
        type: newType,
        note: newNote.trim() || null
      })
      .select("id, date, type, note")
      .single();

    if (error) {
      console.error("CALENDAR INSERT ERROR:", error);
      showToast(copy.insertError + ": " + error.message, "error");
      setSaving(false);
      setAddModalOpen(false);
      return;
    }

    // Add the returned row directly to state
    if (inserted) {
      setEvents((prev) => [
        ...prev,
        {
          id: inserted.id as string,
          date: inserted.date as string,
          type: inserted.type as string,
          note: (inserted.note as string) ?? ""
        }
      ]);
    }

    showToast(locale === "en" ? "Event added" : "Evento agregado", "success");
    setSaving(false);
    setAddModalOpen(false);
  };

  // ── DELETE event with error handling ──
  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("user_events").delete().eq("id", eventId);
    if (error) {
      console.error("CALENDAR DELETE ERROR:", error);
      showToast("Error: " + error.message, "error");
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast(locale === "en" ? "Event deleted" : "Evento eliminado", "success");
  };

  const getEventColor = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.color ?? "#6b7280";
  };

  return (
    <>
      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{copy.title}</h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handlePrevMonth} className="rounded-xl border border-border bg-panelAlt px-3 py-1.5 text-sm hover:bg-accent hover:text-white transition">
                ←
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {monthNames[month]} {year}
              </span>
              <button type="button" onClick={handleNextMonth} className="rounded-xl border border-border bg-panelAlt px-3 py-1.5 text-sm hover:bg-accent hover:text-white transition">
                →
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {EVENT_TYPES.map((t) => (
              <div key={t.value} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-muted">{locale === "en" ? t.labelEn : t.label}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-border">
            {/* Day headers */}
            {dayNames.map((name) => (
              <div key={name} className="bg-[#f5f5dc] px-2 py-2 text-center text-xs font-medium text-muted">
                {name}
              </div>
            ))}

            {/* Day cells — with REAL color highlight */}
            {days.map((day, i) => {
              const dayEvents = eventsForDate(day.date);
              const isToday = day.date === todayStr;
              const isSelected = day.date === selectedDate;
              const hasEvents = dayEvents.length > 0;
              // Determine cell background color from first event type
              const primaryEventColor = hasEvents ? getEventColor(dayEvents[0].type) : null;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(day.date)}
                  className={`relative min-h-[56px] p-1.5 text-left text-xs transition
                    ${day.isCurrentMonth ? "bg-panel hover:bg-panelAlt" : "bg-panelAlt/50 text-muted/50"}
                    ${isToday ? "ring-2 ring-accent ring-inset" : ""}
                    ${isSelected ? "bg-accentSoft" : ""}
                  `}
                  style={hasEvents && day.isCurrentMonth ? { backgroundColor: primaryEventColor + "22", borderLeft: `3px solid ${primaryEventColor}` } : undefined}
                >
                  <span className={`font-medium ${isToday ? "text-accent" : ""}`}>{day.day}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayEvents.slice(0, 3).map((evt) => (
                        <div key={evt.id} className="h-2 w-2 rounded-full" style={{ backgroundColor: getEventColor(evt.type) }} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[8px] text-muted">+{dayEvents.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Events for selected date */}
          {selectedDate && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{selectedDate}</p>
              {eventsForDate(selectedDate).length === 0 ? (
                <p className="text-xs text-muted">{copy.noEvents}</p>
              ) : (
                eventsForDate(selectedDate).map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between rounded-xl border border-border bg-panelAlt px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getEventColor(evt.type) }} />
                      <span className="font-medium">{EVENT_TYPES.find((t) => t.value === evt.type)?.[locale === "en" ? "labelEn" : "label"] ?? evt.type}</span>
                      {evt.note && <span className="text-muted">— {evt.note}</span>}
                    </div>
                    {canEdit && (
                      <button type="button" onClick={() => void handleDeleteEvent(evt.id)} className="text-danger hover:underline text-xs">
                        {copy.delete}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* Add event modal */}
      <Modal open={addModalOpen} title={copy.addEvent} onClose={() => setAddModalOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-muted">{selectedDate}</p>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.type}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {locale === "en" ? t.labelEn : t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.note}</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="..."
            />
          </label>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              {copy.cancel}
            </Button>
            <Button onClick={handleAddEvent} disabled={saving}>
              {saving ? "..." : copy.save}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
