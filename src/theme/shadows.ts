import { StyleSheet } from 'react-native';

export const shadows = StyleSheet.create({
  // Subtle card elevation
  cardLow: {
    shadowColor: '#2C2216',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // Standard tactile floating card
  cardMedium: {
    shadowColor: '#2C2216',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  // High prominent reminder card / floating overlay
  cardHigh: {
    shadowColor: '#1A140D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  // Tactile button resting depth
  buttonTactile: {
    shadowColor: '#0E1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  // Embossed gold pill
  goldEmbossed: {
    shadowColor: '#8C6C26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
});
