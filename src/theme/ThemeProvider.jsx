import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

// Convertit l'objet de couleurs de la config en variables CSS --color-xxx
function applyColorVariables(colors) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    const cssVarName = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(cssVarName, value);
  });
}

function applyFontVariables(fonts) {
  const root = document.documentElement;
  root.style.setProperty('--font-display', fonts.display);
  root.style.setProperty('--font-body', fonts.body);
  root.style.setProperty('--font-mono', fonts.mono);
}

function injectGoogleFonts(url) {
  if (!url) return;
  if (document.querySelector('link[data-theme-font]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.setAttribute('data-theme-font', 'true');
  document.head.appendChild(link);
}

/**
 * Applique le thème (couleurs + polices) d'une config de site au document,
 * en variables CSS globales. Changer de marque = passer une autre `theme`.
 */
export function ThemeProvider({ theme, brandName, children }) {
  useEffect(() => {
    applyColorVariables(theme.colors);
    applyFontVariables(theme.fonts);
    injectGoogleFonts(theme.fonts.googleFontsUrl);
  }, [theme]);

  useEffect(() => {
    if (brandName) document.title = brandName;
  }, [brandName]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
