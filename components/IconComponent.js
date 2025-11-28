import React from 'react';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export const IconComponent = ({ family, name, size = 16, color = '#4a5568', style }) => {
  const IconFamily = {
    Ionicons,
    MaterialIcons,
    FontAwesome5
  }[family];

  if (!IconFamily) {
    console.warn(`Icon family "${family}" not found`);
    return null;
  }

  return (
    <IconFamily
      name={name}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default IconComponent;
