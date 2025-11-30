/**
 * Navigation Helper Utilities
 * Provides safe navigation functions to prevent "GO_BACK action not handled" warnings
 */

export const safeGoBack = (navigation, fallbackScreen = 'Dashboard') => {
  if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
    navigation.goBack();
  } else if (navigation && typeof navigation.navigate === 'function') {
    navigation.navigate(fallbackScreen);
  }
};

export const safeNavigate = (navigation, screen, params = {}) => {
  if (navigation && typeof navigation.navigate === 'function') {
    navigation.navigate(screen, params);
  }
};

export const canGoBack = (navigation) => {
  return navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();
};
