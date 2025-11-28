// contexts/ThemeContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Themes from '../themes'; // imports from themes/index.js
import AnalyticsService from '../services/AnalyticsService';

const STORAGE_KEY = 'SPENDFLOW_SELECTED_THEME';

const ThemeContext = createContext({
  theme: Themes.SleekMinimalDefault, // fallback
  themes: {},
  applyTheme: async (id) => {},
});

export function ThemeProvider({ children }) {
  const themeMap = {
    // Classic themes
    sleek_minimal: Themes.SleekMinimal,
    dark_pro: Themes.DarkPro,
    bold_gradient: Themes.BoldGradient,
    banking_professional: Themes.BankingProfessional,
    soft_pastel: Themes.SoftPastel,
    glassmorphism: Themes.Glassmorphism,
    // Futuristic themes
    cyber_neon: Themes.CyberNeon,
    matrix_green: Themes.MatrixGreen,
    neon_sunset: Themes.NeonSunset,
    aurora_boreal: Themes.AuroraBoreal,
    deep_space: Themes.DeepSpace,
    hologram_blue: Themes.HologramBlue,
    techno_red: Themes.TechnoRed,
    quantum_purple: Themes.QuantumPurple,
  };

  const [themeId, setThemeId] = useState('sleek_minimal');
  const [theme, setTheme] = useState(themeMap[themeId]);

  // load saved theme
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && themeMap[saved]) {
          setThemeId(saved);
          setTheme(themeMap[saved]);
        }
      } catch (e) {
        console.warn('Failed to load theme', e);
      }
    })();
  }, []);

  const applyTheme = useCallback(
    async (id) => {
      if (!themeMap[id]) return;
      try {
        await AsyncStorage.setItem(STORAGE_KEY, id);
        AnalyticsService.trackThemeChanged(id);
      } catch (e) {
        console.warn('Failed to save theme', e);
      }
      setThemeId(id);
      setTheme(themeMap[id]);
    },
    [setTheme, setThemeId]
  );

  return (
    <ThemeContext.Provider value={{ theme, themes: themeMap, applyTheme, themeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
