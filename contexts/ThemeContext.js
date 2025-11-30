// contexts/ThemeContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Themes from '../themes'; // imports from themes/index.js
import AnalyticsService from '../services/AnalyticsService';

const STORAGE_KEY = 'SPENDFLOW_SELECTED_THEME';

// Create the context
export const ThemeContext = createContext({
  theme: {},
  themes: {},
  applyTheme: () => {},
  themeId: 'sleek_minimal',
});

// Create the provider component
export const ThemeProvider = ({ children }) => {
  const themeMap = {
    sleek_minimal: Themes.SleekMinimal || {},
    dark_pro: Themes.DarkPro || {},
    bold_gradient: Themes.BoldGradient || {},
    banking_professional: Themes.BankingProfessional || {},
    soft_pastel: Themes.SoftPastel || {},
    glassmorphism: Themes.Glassmorphism || {},
    cyber_neon: Themes.CyberNeon || {},
    matrix_green: Themes.MatrixGreen || {},
    neon_sunset: Themes.NeonSunset || {},
    aurora_boreal: Themes.AuroraBoreal || {},
    deep_space: Themes.DeepSpace || {},
    hologram_blue: Themes.HologramBlue || {},
    techno_red: Themes.TechnoRed || {},
    quantum_purple: Themes.QuantumPurple || {},
  };

  const [themeId, setThemeId] = useState('sleek_minimal');
  const [theme, setTheme] = useState(themeMap['sleek_minimal'] || {
    id: 'sleek_minimal',
    name: 'Sleek Minimal',
    gradient: ['#007AFF', '#60A5FA'],
    background: ['#F2F2F7', '#F2F2F7'],
    cardBg: '#FFFFFF',
    primary: '#007AFF',
    accent: '#34C759',
    text: '#1C1C1E',
    textSecondary: '#6B7280',
  });

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedThemeId = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedThemeId && themeMap[savedThemeId]) {
          setThemeId(savedThemeId);
          setTheme(themeMap[savedThemeId]);
        }
      } catch (error) {
        console.warn('Failed to load theme', error);
      }
    };
    loadTheme();
  }, []);

  const applyTheme = useCallback(async (id) => {
    if (!themeMap[id]) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, id);
      if (AnalyticsService && typeof AnalyticsService.trackThemeChanged === 'function') {
        AnalyticsService.trackThemeChanged(id);
      }
      setThemeId(id);
      setTheme(themeMap[id]);
    } catch (error) {
      console.warn('Failed to save theme', error);
    }
  }, [themeMap]);

  return (
    <ThemeContext.Provider value={{ 
      theme: theme || {
        id: 'sleek_minimal',
        name: 'Sleek Minimal',
        gradient: ['#007AFF', '#60A5FA'],
        background: ['#F2F2F7', '#F2F2F7'],
        cardBg: '#FFFFFF',
        primary: '#007AFF',
        accent: '#34C759',
        text: '#1C1C1E',
        textSecondary: '#6B7280',
      }, 
      themes: themeMap, 
      applyTheme, 
      themeId 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

// Export the context and provider
export default ThemeProvider;
