export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: string;
}

export type MagnitudeLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface Earthquake {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: number;
  magnitudeScale: string;
  depth: number;
  location: string;
  timestamp: string; // ISO String
  provider: 'AFAD' | 'KANDILLI' | 'EMSC' | string;
  level: MagnitudeLevel;
  description: string;
}

export interface EarthquakeStats {
  totalCountToday: number;
  maxMagnitudeToday: number;
  lastEventLocation: string;
  lastEventTime: string;
}
