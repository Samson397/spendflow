import React, { createContext, useContext, useState } from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext();

export const useCustomAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: null
  });

  const showAlert = (title, message, buttons = null) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons
    });
  };

  const hideAlert = () => {
    setAlert({
      visible: false,
      title: '',
      message: '',
      buttons: null
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alert }}>
      {children}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};
