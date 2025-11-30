// Security Check - Prevent API Key Exposure in Production
export const checkSecurity = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Check for exposed API keys in browser
    const warnings = [];
    
    // Check if API keys are hardcoded in window object
    if (window.API_CONFIG?.DEEPSEEK_API_KEY && window.API_CONFIG.DEEPSEEK_API_KEY.startsWith('sk-')) {
      warnings.push('🚨 API KEY EXPOSED: DeepSeek API key is exposed in browser!');
    }
    
    // Check for Firebase config exposure
    if (window.FIREBASE_CONFIG?.apiKey) {
      warnings.push('🚨 CONFIG EXPOSED: Firebase configuration is exposed in browser!');
    }
    
    // Log warnings in development only
    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('🔒 Security Issues Found:', warnings);
    }
    
    return {
      isSecure: warnings.length === 0,
      warnings
    };
  }
  
  return { isSecure: true, warnings: [] };
};

// Remove sensitive data from console in production
export const secureConsole = () => {
  if (process.env.NODE_ENV === 'production') {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    // Filter out sensitive information from console logs
    const filterSensitive = (method) => {
      return (...args) => {
        const filteredArgs = args.map(arg => {
          if (typeof arg === 'string') {
            // Remove API keys and sensitive data
            return arg.replace(/sk-[a-zA-Z0-9]{48}/g, '[API_KEY_HIDDEN]')
                    .replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, '[API_KEY_HIDDEN]')
                    .replace(/"apiKey":\s*"[^"]+"/g, '"apiKey":"[HIDDEN]"');
          }
          return arg;
        });
        return method(...filteredArgs);
      };
    };
    
    console.log = filterSensitive(originalLog);
    console.warn = filterSensitive(originalWarn);
    console.error = filterSensitive(originalError);
  }
};
