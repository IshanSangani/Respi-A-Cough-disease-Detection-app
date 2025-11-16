import React from 'react';
import { View, Text, ViewProps, StyleSheet } from 'react-native';

interface CardProps extends ViewProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className, ...rest }) => {
  return (
    <View style={[styles.card, rest.style as any]} {...rest}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#1e8cff',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#0553b4',
  },
});

export default Card;