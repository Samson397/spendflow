import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import LocationService from '../services/LocationService';
import LocationPermissionModal from '../components/LocationPermissionModal';
import CurrencySettingsModal from '../components/CurrencySettingsModal';
import { currencies } from '../constants/currencies';
import { useAuth } from './AuthContext';
import FirebaseService from '../services/FirebaseService';

const CurrencyContext = createContext({});

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(currencies.find(c => c.code === 'GBP'));
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCurrencySettings, setShowCurrencySettings] = useState(false);
  const hasLoadedCurrency = useRef(false);

  // Load currency preference from Firebase when user logs in
  useEffect(() => {
    const loadCurrencyPreference = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      
      // Only load once per user session
      if (hasLoadedCurrency.current) return;
      hasLoadedCurrency.current = true;
      
      try {
        const result = await FirebaseService.getUserProfile(user.uid);
        if (result.success && result.data?.currency) {
          const savedCurrency = currencies.find(c => c.code === result.data.currency);
          if (savedCurrency) {
            setCurrency(savedCurrency);
            setLoading(false);
            return;
          }
        }
        // No currency saved - ask for location permission
        setLoading(false);
        setShowPermissionModal(true);
      } catch (error) {
        console.warn('Error loading currency preference:', error);
        setLoading(false);
        setShowPermissionModal(true);
      }
    };
    
    loadCurrencyPreference();
  }, [user?.uid]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      hasLoadedCurrency.current = false;
      setCurrency(currencies.find(c => c.code === 'GBP'));
    }
  }, [user]);

  // Save currency preference to Firebase
  const saveCurrencyPreference = async (newCurrency) => {
    setCurrency(newCurrency);
    if (user?.uid) {
      try {
        await FirebaseService.updateUserProfile(user.uid, {
          currency: newCurrency.code
        });
      } catch (error) {
        console.warn('Failed to save currency to Firebase:', error);
      }
    }
  };

  const formatAmount = (amount, options = {}) => {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return `${currency.symbol}0.00`;
    return `${currency.symbol}${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getFormattedLocation = () => {
    return LocationService.getFormattedLocation();
  };

  const handlePermissionAllow = async () => {
    setShowPermissionModal(false);
    
    try {
      const detectedCurrency = await LocationService.detectUserCurrency();
      if (detectedCurrency) {
        await saveCurrencyPreference(detectedCurrency);
      } else {
        // Detection returned null, show manual settings
        setShowCurrencySettings(true);
      }
    } catch (error) {
      console.warn('Location detection failed:', error);
      // If detection fails, show manual settings
      setShowCurrencySettings(true);
    }
  };

  const handlePermissionDeny = () => {
    setShowPermissionModal(false);
    // User denied location - show manual currency settings
    setShowCurrencySettings(true);
  };

  const openCurrencySettings = () => {
    setShowCurrencySettings(true);
  };

  const handleCurrencySettingsSave = async (newCurrency) => {
    await saveCurrencyPreference(newCurrency);
    setShowCurrencySettings(false);
  };

  const value = {
    currency,
    setCurrency: saveCurrencyPreference,
    formatAmount,
    loading,
    openCurrencySettings,
    getFormattedLocation
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
      <LocationPermissionModal
        visible={showPermissionModal}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
        onClose={handlePermissionDeny}
      />
      <CurrencySettingsModal
        visible={showCurrencySettings}
        onClose={() => setShowCurrencySettings(false)}
        onSave={handleCurrencySettingsSave}
        currentCurrency={currency}
      />
    </CurrencyContext.Provider>
  );
}
