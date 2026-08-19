// Traduit une clé de couleur de la config ("ink", "primaryDeep", ...)
// en variable CSS correspondante ("var(--color-ink)", "var(--color-primary-deep)").
export function colorVar(key) {
  if (!key) return undefined;
  const cssVarName = '--color-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
  return `var(${cssVarName})`;
}
