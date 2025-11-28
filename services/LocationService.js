import { Platform } from 'react-native';
import * as Location from 'expo-location';

// Currency mapping by country code
const CURRENCY_MAP = {
  // Major currencies
  'US': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'GB': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'DE': { code: 'EUR', symbol: '€', name: 'Euro' },
  'FR': { code: 'EUR', symbol: '€', name: 'Euro' },
  'IT': { code: 'EUR', symbol: '€', name: 'Euro' },
  'ES': { code: 'EUR', symbol: '€', name: 'Euro' },
  'NL': { code: 'EUR', symbol: '€', name: 'Euro' },
  'BE': { code: 'EUR', symbol: '€', name: 'Euro' },
  'AT': { code: 'EUR', symbol: '€', name: 'Euro' },
  'PT': { code: 'EUR', symbol: '€', name: 'Euro' },
  'IE': { code: 'EUR', symbol: '€', name: 'Euro' },
  'FI': { code: 'EUR', symbol: '€', name: 'Euro' },
  'GR': { code: 'EUR', symbol: '€', name: 'Euro' },
  'CA': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  'AU': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  'JP': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  'CN': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  'IN': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'BR': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  'MX': { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  'KR': { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  'SG': { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  'HK': { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  'CH': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  'SE': { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  'NO': { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  'DK': { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  'PL': { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  'CZ': { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  'HU': { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  'RO': { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  'BG': { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  'HR': { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  'RU': { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  'TR': { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  'ZA': { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  'EG': { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
  'AE': { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  'SA': { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  'IL': { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  'TH': { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  'MY': { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  'ID': { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  'PH': { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  'VN': { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  'NZ': { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  'CL': { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  'AR': { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  'CO': { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  'PE': { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  'UY': { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  'PY': { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani' },
};

// Default currency if detection fails
const DEFAULT_CURRENCY = { code: 'USD', symbol: '$', name: 'US Dollar' };

// Country code to country name mapping
const COUNTRY_NAMES = {
  'US': 'USA',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'AT': 'Austria',
  'PT': 'Portugal',
  'IE': 'Ireland',
  'FI': 'Finland',
  'GR': 'Greece',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'KR': 'South Korea',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'CH': 'Switzerland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'RU': 'Russia',
  'TR': 'Turkey',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'AE': 'UAE',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'TH': 'Thailand',
  'MY': 'Malaysia',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'VN': 'Vietnam',
  'NZ': 'New Zealand',
  'CL': 'Chile',
  'AR': 'Argentina',
  'CO': 'Colombia',
  'PE': 'Peru',
  'UY': 'Uruguay',
  'PY': 'Paraguay',
};

class LocationService {
  constructor() {
    this.currentCurrency = DEFAULT_CURRENCY;
    this.locationPermissionGranted = false;
    this.permissionAsked = false;
    this.currentLocation = {
      country: null,
      countryCode: null,
      city: null,
      region: null
    };
    this.permissionCallbacks = [];
  }

  // Set permission modal callback
  setPermissionModalCallback(callback) {
    this.permissionModalCallback = callback;
  }

  // Request location permission with modal
  async requestLocationPermissionWithModal() {
    return new Promise((resolve) => {
      if (this.permissionAsked) {
        resolve(this.locationPermissionGranted);
        return;
      }

      // Show permission modal if callback is set
      if (this.permissionModalCallback) {
        this.permissionModalCallback({
          onAllow: async () => {
            this.permissionAsked = true;
            const granted = await this.requestLocationPermission();
            resolve(granted);
          },
          onDeny: () => {
            this.permissionAsked = true;
            resolve(false);
          }
        });
      } else {
        // Fallback to direct permission request
        this.requestLocationPermission().then(resolve);
      }
    });
  }

  // Request location permission (system level)
  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.locationPermissionGranted = status === 'granted';
      return this.locationPermissionGranted;
    } catch (error) {
      console.warn('Location permission request failed:', error);
      return false;
    }
  }

  // Get user's current location
  async getCurrentLocation() {
    try {
      if (!this.locationPermissionGranted) {
        const permissionGranted = await this.requestLocationPermissionWithModal();
        if (!permissionGranted) {
          throw new Error('Location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low, // Low accuracy is sufficient for country detection
        timeout: 10000, // 10 second timeout
      });

      return location;
    } catch (error) {
      console.warn('Failed to get current location:', error);
      return null;
    }
  }

  // Get location info from coordinates using reverse geocoding
  async getLocationFromCoordinates(latitude, longitude) {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        const countryCode = location.isoCountryCode;
        
        const locationInfo = {
          country: COUNTRY_NAMES[countryCode] || location.country || 'Unknown',
          countryCode: countryCode,
          city: location.city || location.subregion || 'Unknown City',
          region: location.region || location.administrativeArea || null
        };
        
        // Store location info
        this.currentLocation = locationInfo;
        return locationInfo;
      }

      return null;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  }

  // Get currency from country code
  getCurrencyFromCountry(countryCode) {
    if (!countryCode) return DEFAULT_CURRENCY;
    
    const upperCountryCode = countryCode.toUpperCase();
    return CURRENCY_MAP[upperCountryCode] || DEFAULT_CURRENCY;
  }

  // Detect user's currency based on location
  async detectUserCurrency() {
    try {
      // First try to get from browser locale (web only)
      if (Platform.OS === 'web') {
        const browserCurrency = this.getCurrencyFromBrowserLocale();
        if (browserCurrency) {
          this.currentCurrency = browserCurrency;
          return browserCurrency;
        }
      }

      // Try to get location
      const location = await this.getCurrentLocation();
      if (location) {
        const locationInfo = await this.getLocationFromCoordinates(
          location.coords.latitude,
          location.coords.longitude
        );
        
        if (locationInfo && locationInfo.countryCode) {
          const currency = this.getCurrencyFromCountry(locationInfo.countryCode);
          this.currentCurrency = currency;
          return currency;
        }
      }

      // Fallback to default
      return DEFAULT_CURRENCY;
    } catch (error) {
      console.warn('Currency detection failed:', error);
      return DEFAULT_CURRENCY;
    }
  }

  // Get currency from browser locale (web only)
  getCurrencyFromBrowserLocale() {
    if (Platform.OS !== 'web') return null;

    try {
      // Get browser locale
      const locale = navigator.language || navigator.languages[0];
      if (!locale) return null;

      // Extract country code from locale (e.g., 'en-US' -> 'US')
      const parts = locale.split('-');
      if (parts.length < 2) return null;

      const countryCode = parts[1].toUpperCase();
      
      // Store location info from browser locale
      this.currentLocation = {
        country: COUNTRY_NAMES[countryCode] || countryCode,
        countryCode: countryCode,
        city: 'Unknown City', // Can't get city from browser locale
        region: null
      };
      
      return this.getCurrencyFromCountry(countryCode);
    } catch (error) {
      console.warn('Browser locale detection failed:', error);
      return null;
    }
  }

  // Get current location info
  getCurrentLocationInfo() {
    return this.currentLocation;
  }

  // Get formatted location string (e.g., "USA - New York")
  getFormattedLocation() {
    if (!this.currentLocation.country || !this.currentLocation.city) {
      return 'Location Unknown';
    }
    return `${this.currentLocation.country} - ${this.currentLocation.city}`;
  }

  // Get date format based on region
  getDateFormat() {
    const countryCode = this.currentLocation.countryCode;
    
    // US uses MM/DD/YYYY, most others use DD/MM/YYYY
    const usFormat = ['US'];
    const isoFormat = ['SE', 'NO', 'DK', 'FI', 'JP', 'KR', 'CN']; // YYYY-MM-DD
    
    if (usFormat.includes(countryCode)) {
      return 'MM/DD/YYYY';
    } else if (isoFormat.includes(countryCode)) {
      return 'YYYY-MM-DD';
    } else {
      return 'DD/MM/YYYY'; // Default European format
    }
  }

  // Format date according to region
  formatDate(date, options = {}) {
    const {
      includeYear = true,
      shortFormat = false
    } = options;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const countryCode = this.currentLocation.countryCode;
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const shortYear = year.toString().slice(-2);

    // US format: MM/DD/YYYY
    if (countryCode === 'US') {
      if (shortFormat) {
        return includeYear ? `${month}/${day}/${shortYear}` : `${month}/${day}`;
      }
      return includeYear ? `${month}/${day}/${year}` : `${month}/${day}`;
    }
    
    // ISO format: YYYY-MM-DD (Scandinavian, Asian countries)
    if (['SE', 'NO', 'DK', 'FI', 'JP', 'KR', 'CN'].includes(countryCode)) {
      if (shortFormat) {
        return includeYear ? `${shortYear}-${month}-${day}` : `${month}-${day}`;
      }
      return includeYear ? `${year}-${month}-${day}` : `${month}-${day}`;
    }
    
    // European format: DD/MM/YYYY (default)
    if (shortFormat) {
      return includeYear ? `${day}/${month}/${shortYear}` : `${day}/${month}`;
    }
    return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
  }

  // Get locale string for native date formatting
  getLocaleString() {
    const countryCode = this.currentLocation.countryCode;
    
    const localeMap = {
      'US': 'en-US',
      'GB': 'en-GB', 
      'DE': 'de-DE',
      'FR': 'fr-FR',
      'ES': 'es-ES',
      'IT': 'it-IT',
      'JP': 'ja-JP',
      'CN': 'zh-CN',
      'KR': 'ko-KR',
      'IN': 'hi-IN',
      'BR': 'pt-BR',
      'MX': 'es-MX',
      'CA': 'en-CA',
      'AU': 'en-AU',
      'SE': 'sv-SE',
      'NO': 'nb-NO',
      'DK': 'da-DK',
      'FI': 'fi-FI',
      'NL': 'nl-NL',
      'BE': 'nl-BE',
      'CH': 'de-CH',
      'AT': 'de-AT',
      'PL': 'pl-PL',
      'CZ': 'cs-CZ',
      'HU': 'hu-HU',
      'RU': 'ru-RU',
      'TR': 'tr-TR',
      'ZA': 'en-ZA',
      'AE': 'ar-AE',
      'SA': 'ar-SA',
      'TH': 'th-TH',
      'MY': 'ms-MY',
      'ID': 'id-ID',
      'PH': 'en-PH',
      'VN': 'vi-VN',
      'SG': 'en-SG',
      'HK': 'zh-HK',
      'NZ': 'en-NZ'
    };
    
    return localeMap[countryCode] || 'en-US';
  }

  // Format amount with current currency
  formatAmount(amount, options = {}) {
    const {
      showSymbol = true,
      showCode = false,
      decimals = 2
    } = options;

    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[£$€¥₹₩,]/g, '')) 
      : amount;

    if (isNaN(numericAmount)) return '0.00';

    const formattedNumber = numericAmount.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    let result = '';
    
    if (showSymbol) {
      result = `${this.currentCurrency.symbol}${formattedNumber}`;
    } else {
      result = formattedNumber;
    }

    if (showCode) {
      result += ` ${this.currentCurrency.code}`;
    }

    return result;
  }

  // Get current currency info
  getCurrentCurrency() {
    return this.currentCurrency;
  }

  // Set currency manually
  setCurrency(currencyCode) {
    const currency = Object.values(CURRENCY_MAP).find(c => c.code === currencyCode);
    if (currency) {
      this.currentCurrency = currency;
      return currency;
    }
    return this.currentCurrency;
  }

  // Set location and currency manually
  setLocationAndCurrency(locationInfo, currency) {
    this.currentLocation = {
      country: locationInfo.country || 'Unknown',
      countryCode: locationInfo.countryCode || null,
      city: locationInfo.city || 'Unknown City',
      region: locationInfo.region || null
    };
    
    if (currency) {
      this.currentCurrency = currency;
    }
    
    return {
      location: this.currentLocation,
      currency: this.currentCurrency
    };
  }

  // Get all available currencies (unique only)
  getAllCurrencies() {
    const uniqueCurrencies = new Map();
    
    // Get unique currencies by code
    Object.values(CURRENCY_MAP).forEach(currency => {
      uniqueCurrencies.set(currency.code, currency);
    });
    
    // Convert to array and sort
    return Array.from(uniqueCurrencies.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Export singleton instance
export default new LocationService();
