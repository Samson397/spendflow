// Development-only logging utility
// Set to false for production to minimize console output

const DEV_MODE = process.env.NODE_ENV === 'development';

const logger = {
  log: (message, data) => {
    if (DEV_MODE) {
      console.log(message, data);
    }
  },
  
  warn: (message, data) => {
    if (DEV_MODE) {
      console.warn(message, data);
    }
  },
  
  error: (message, data) => {
    if (DEV_MODE) {
      console.error(message, data);
    }
  },
  
  // Always log critical errors
  critical: (message, data) => {
    console.error('CRITICAL:', message, data);
  },
  
  // AI Service specific logging (minimal)
  ai: {
    request: (endpoint, mode) => {
      if (DEV_MODE) {
        console.log(`AI Request: ${endpoint} (${mode})`);
      }
    },
    
    response: (tokens, duration) => {
      if (DEV_MODE) {
        console.log(`AI Response: ${tokens} tokens in ${duration}ms`);
      }
    },
    
    error: (error) => {
      if (DEV_MODE && !error.message.includes('configured')) {
        console.warn('AI Error:', error.message);
      }
    }
  }
};

export default logger;
