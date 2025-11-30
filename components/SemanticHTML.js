import React from 'react';
import { View, Text, Image, Platform } from 'react-native';

// Semantic HTML components for web SEO
export const H1 = ({ children, style, ...props }) => (
  <Text 
    {...props}
    style={[style, { fontSize: 32, fontWeight: 'bold', lineHeight: 40 }]}
    accessibilityRole="header"
    accessibilityLevel={1}
  >
    {children}
  </Text>
);

export const H2 = ({ children, style, ...props }) => (
  <Text 
    {...props}
    style={[style, { fontSize: 24, fontWeight: 'bold', lineHeight: 32 }]}
    accessibilityRole="header"
    accessibilityLevel={2}
  >
    {children}
  </Text>
);

export const H3 = ({ children, style, ...props }) => (
  <Text 
    {...props}
    style={[style, { fontSize: 20, fontWeight: '600', lineHeight: 28 }]}
    accessibilityRole="header"
    accessibilityLevel={3}
  >
    {children}
  </Text>
);

export const H4 = ({ children, style, ...props }) => (
  <Text 
    {...props}
    style={[style, { fontSize: 18, fontWeight: '600', lineHeight: 26 }]}
    accessibilityRole="header"
    accessibilityLevel={4}
  >
    {children}
  </Text>
);

export const Main = ({ children, style, ...props }) => (
  <View 
    {...props}
    style={[style]}
    accessibilityRole="main"
  >
    {children}
  </View>
);

export const Section = ({ children, style, ...props }) => (
  <View 
    {...props}
    style={[style]}
    accessibilityRole="region"
  >
    {children}
  </View>
);

export const Article = ({ children, style, ...props }) => (
  <View 
    {...props}
    style={[style]}
    accessibilityRole="article"
  >
    {children}
  </View>
);

export const Nav = ({ children, style, ...props }) => (
  <View 
    {...props}
    style={[style]}
    accessibilityRole="navigation"
  >
    {children}
  </View>
);

export const Aside = ({ children, style, ...props }) => (
  <View 
    {...props}
    style={[style]}
    accessibilityRole="complementary"
  >
    {children}
  </View>
);

export const Figure = ({ children, style, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <figure style={style} {...props}>
        {children}
      </figure>
    );
  }
  // Fallback to View for mobile
  return <View style={style} {...props} />;
};

export const Figcaption = ({ children, style, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <figcaption style={style} {...props}>
        {children}
      </figcaption>
    );
  }
  // Fallback to Text for mobile
  return (
    <Text 
      {...props}
      style={[style, { fontSize: 14, fontStyle: 'italic', color: '#666' }]}
      accessibilityRole="text"
    >
      {children}
    </Text>
  );
};

// Image with alt text support
export const Img = ({ source, alt, style, ...props }) => {
  return (
    <img 
      src={source.uri || source}
      alt={alt || ''}
      style={style}
      {...props}
    />
  );
};

// Web image component with proper React Native Web support
export const WebImg = ({ source, alt, style, className, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <img 
        src={source.uri || source}
        alt={alt || ''}
        style={style}
        className={className}
        {...props}
      />
    );
  }
  // Fallback to React Native Image for mobile
  return <Image source={source} style={style} {...props} />;
};
