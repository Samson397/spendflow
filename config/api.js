// API Configuration
// SECURITY: API keys should never be hardcoded in frontend code
// Use environment variables instead

const API_CONFIG = {
  DEEPSEEK_API_KEY:
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ||
    process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ||
    process.env.REACT_APP_DEEPSEEK_API_KEY ||
    ''
};

if (!API_CONFIG.DEEPSEEK_API_KEY) {
  console.warn('⚠️ DeepSeek API key missing. AI features will remain disabled until EXPO_PUBLIC_DEEPSEEK_API_KEY (or equivalent) is set.');
}

export default API_CONFIG;
