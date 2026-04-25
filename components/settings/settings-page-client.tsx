"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useI18n } from "@/lib/i18n/context";

const THEMES = [
  "theme-default",
  "theme-dark",
  "theme-light",
  "theme-industrial",
  "theme-blue",
  "theme-soft-blue",
  "theme-soft-green",
  "theme-soft-rose",
  "theme-soft-purple"
];

const UNIT_GROUPS = {
  mass: ["kg", "g", "lb"],
  volume: ["L", "ml", "gal"],
  length: ["m", "cm", "ft", "in"],
  count: ["piezas", "units"]
};

export function SettingsPageClient() {
  const { locale, setLocale } = useI18n();
  const [theme, setTheme] = useState("theme-default");
  const [unit, setUnit] = useState("piezas");
  const [freq, setFreq] = useState("30");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  const copy =
    locale === "en"
      ? {
          title: "Settings",
          subtitle: "System preferences and configurations",
          language: "Language",
          theme: "Theme",
          defaultUnit: "Default Unit",
          defaultFreq: "Default PM Frequency (days)",
          timezone: "Timezone",
          dateFormat: "Date Format",
          save: "Save Preferences",
          saved: "Saved!",
          themes: {
            "theme-default": "System Default",
            "theme-dark": "Dark Mode",
            "theme-light": "Light Mode",
            "theme-industrial": "Industrial",
            "theme-blue": "Ocean Blue",
            "theme-soft-blue": "Soft Blue",
            "theme-soft-green": "Soft Green",
            "theme-soft-rose": "Soft Rose",
            "theme-soft-purple": "Soft Purple"
          },
          unitCategory: "Unit Category",
          unit: "Unit"
        }
      : {
          title: "Configuración",
          subtitle: "Preferencias y configuración del sistema",
          language: "Idioma",
          theme: "Tema Visual",
          defaultUnit: "Unidad por Defecto",
          defaultFreq: "Frecuencia PM por Defecto (días)",
          timezone: "Zona Horaria",
          dateFormat: "Formato de Fecha",
          save: "Guardar Preferencias",
          saved: "¡Guardado!",
          themes: {
            "theme-default": "Por defecto",
            "theme-dark": "Modo Oscuro",
            "theme-light": "Modo Claro",
            "theme-industrial": "Industrial",
            "theme-blue": "Azul Océano",
            "theme-soft-blue": "Azul Suave",
            "theme-soft-green": "Verde Suave",
            "theme-soft-rose": "Rosa Suave",
            "theme-soft-purple": "Morado Suave"
          },
          unitCategory: "Categoría de Unidad",
          unit: "Unidad"
        };

  useEffect(() => {
    // Load from local storage
    setTheme(localStorage.getItem("cmms_theme") || "theme-default");
    const savedUnit = localStorage.getItem("cmms_default_unit") || "piezas";
    setUnit(savedUnit);
    
    // Find category for saved unit
    for (const [cat, units] of Object.entries(UNIT_GROUPS)) {
      if (units.includes(savedUnit)) {
        setUnitCategory(cat as keyof typeof UNIT_GROUPS);
        break;
      }
    }
    setFreq(localStorage.getItem("cmms_default_pm_freq") || "30");
    setTimezone(localStorage.getItem("cmms_timezone") || "UTC");
    setDateFormat(localStorage.getItem("cmms_date_format") || "YYYY-MM-DD");
  }, []);

  const handleSave = () => {
    localStorage.setItem("cmms_theme", theme);
    localStorage.setItem("cmms_default_unit", unit);
    localStorage.setItem("cmms_default_pm_freq", freq);
    localStorage.setItem("cmms_timezone", timezone);
    localStorage.setItem("cmms_date_format", dateFormat);

    // Apply theme globally
    document.documentElement.classList.remove(...THEMES);
    document.documentElement.classList.add(theme);

    alert(copy.saved);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as "en" | "es");
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8 border-[#d6d0b8]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Config</p>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted">{copy.subtitle}</p>
        </div>
      </Panel>

      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea] max-w-2xl">
        <div className="space-y-6">
          
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.language}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={locale}
              onChange={handleLanguageChange}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.theme}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {THEMES.map(t => (
                <option key={t} value={t}>{copy.themes[t as keyof typeof copy.themes]}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2 text-sm">
              <span className="text-muted">{copy.unitCategory}</span>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={unitCategory}
                onChange={(e) => {
                  const newCat = e.target.value as keyof typeof UNIT_GROUPS;
                  setUnitCategory(newCat);
                  setUnit(UNIT_GROUPS[newCat][0]);
                }}
              >
                {Object.keys(UNIT_GROUPS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-muted">{copy.unit}</span>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNIT_GROUPS[unitCategory].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.defaultFreq}</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.timezone}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/Madrid">Europe/Madrid</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.dateFormat}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </label>

          <Button onClick={handleSave}>{copy.save}</Button>
        </div>
      </Panel>
    </div>
  );
}
