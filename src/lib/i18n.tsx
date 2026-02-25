import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Locale = "pt-BR" | "en" | "es";

const translations: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    "dashboard": "Dashboard",
    "smart_links": "Smart Links",
    "utm_report": "Relatório UTM",
    "integrations": "Integrações",
    "webhooks": "Webhooks",
    "webhook_logs": "Webhook Logs",
    "settings": "Configurações",
    "personal_data": "Dados Pessoais",
    "organization": "Minha Organização",
    "projects": "Projetos",
    "team": "Equipe",
    "subscription": "Assinatura",
    "admin": "Administração",
    "support": "Suporte",
    "resources": "Recursos",
    "logout": "Sair",
    "total_views": "Total Views",
    "sales": "Vendas",
    "conversion_rate": "Taxa Conv.",
    "revenue": "Faturamento",
    "avg_ticket": "Ticket Médio",
    "save": "Salvar",
    "cancel": "Cancelar",
    "loading": "Carregando...",
    "no_data": "Nenhum dado encontrado",
    "language": "Idioma",
  },
  "en": {
    "dashboard": "Dashboard",
    "smart_links": "Smart Links",
    "utm_report": "UTM Report",
    "integrations": "Integrations",
    "webhooks": "Webhooks",
    "webhook_logs": "Webhook Logs",
    "settings": "Settings",
    "personal_data": "Personal Data",
    "organization": "My Organization",
    "projects": "Projects",
    "team": "Team",
    "subscription": "Subscription",
    "admin": "Administration",
    "support": "Support",
    "resources": "Resources",
    "logout": "Sign Out",
    "total_views": "Total Views",
    "sales": "Sales",
    "conversion_rate": "Conv. Rate",
    "revenue": "Revenue",
    "avg_ticket": "Avg. Ticket",
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "no_data": "No data found",
    "language": "Language",
  },
  "es": {
    "dashboard": "Dashboard",
    "smart_links": "Smart Links",
    "utm_report": "Informe UTM",
    "integrations": "Integraciones",
    "webhooks": "Webhooks",
    "webhook_logs": "Logs de Webhook",
    "settings": "Configuración",
    "personal_data": "Datos Personales",
    "organization": "Mi Organización",
    "projects": "Proyectos",
    "team": "Equipo",
    "subscription": "Suscripción",
    "admin": "Administración",
    "support": "Soporte",
    "resources": "Recursos",
    "logout": "Salir",
    "total_views": "Vistas Totales",
    "sales": "Ventas",
    "conversion_rate": "Tasa Conv.",
    "revenue": "Ingresos",
    "avg_ticket": "Ticket Promedio",
    "save": "Guardar",
    "cancel": "Cancelar",
    "loading": "Cargando...",
    "no_data": "Sin datos",
    "language": "Idioma",
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "pt-BR",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("nexus-locale");
    return (saved as Locale) || "pt-BR";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("nexus-locale", l);
  }, []);

  const t = useCallback((key: string) => {
    return translations[locale]?.[key] || translations["pt-BR"]?.[key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];
