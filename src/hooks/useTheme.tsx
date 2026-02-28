import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppTheme = "dark" | "light" | "colorful";

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem("app-theme") as AppTheme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light", "theme-colorful");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
