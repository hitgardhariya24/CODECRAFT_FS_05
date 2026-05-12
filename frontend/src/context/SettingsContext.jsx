import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [panelOpen, setPanelOpen] = useState(false);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      panelOpen,
      openPanel,
      closePanel,
    }),
    [panelOpen, openPanel, closePanel]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettingsPanel = () => useContext(SettingsContext);
