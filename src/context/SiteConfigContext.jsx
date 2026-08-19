import { createContext, useContext } from 'react';

const SiteConfigContext = createContext(null);

export function SiteConfigProvider({ config, children }) {
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  return ctx;
}
