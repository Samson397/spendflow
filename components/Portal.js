import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';

let createPortal;
if (Platform.OS === 'web') {
  try {
    createPortal = require('react-dom').createPortal;
  } catch (e) {
    createPortal = null;
  }
}

const Portal = ({ children }) => {
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && createPortal) {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.zIndex = '9999';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
      setPortalContainer(el);

      return () => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      };
    }
  }, []);

  // For web with portal support
  if (Platform.OS === 'web' && portalContainer && createPortal) {
    return createPortal(
      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
      </View>,
      portalContainer
    );
  }

  // Fallback for mobile or when portal is not available
  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 9999 
    }}>
      {children}
    </View>
  );
};

export default Portal;
