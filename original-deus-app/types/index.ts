export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // In real app: bcrypt hash
  role: UserRole;
  createdAt: string;
  createdBy: string; // admin id who created this user
  assignedDeviceIds: string[]; // devices this user can see
  isActive: boolean;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: string;
}

export type DeviceStatus = 'online' | 'offline' | 'warning' | 'alarm';

export interface Device {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  firmwareVersion: string;
  batteryPercent: number;
  lastSeenAt: string;
  todayActivityCount: number;
  automations: Automation[];
  ownerId: string; // admin who registered device
  coverageRadius?: number; // custom coverage radius (km)
  notificationThreshold?: number; // custom notification threshold magnitude (ML/Mw)
  ipAddress?: string;
  port?: number;
  groupId?: string | null;
  isPhysical?: boolean;
}

export interface Automation {
  id: string;
  name: string;
  triggerMagnitude: number;
  action: string;
  isActive: boolean;
}

export type ActivityType = 'seismic' | 'action' | 'system';
export type MagnitudeLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface Activity {
  id: string;
  deviceId: string;
  deviceName: string;
  type: ActivityType;
  estimatedMagnitude: number | null;   // P-wave reading (early warning)
  actualMagnitude: number | null;      // S-wave reading (real magnitude)
  magnitudeScale: 'ML' | 'Mw' | 'MW' | null;
  location: string;
  depth: number | null;                // km
  timestamp: string;
  actions: string[];                   // automated responses triggered
  level: MagnitudeLevel;
  description: string;
  latitude?: number;                   // Optional coordinates for real-world events
  longitude?: number;                  // Optional coordinates for real-world events
  provider?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'alarm' | 'warning' | 'info';
  activityId?: string;
  deviceId?: string;
  isRead: boolean;
  timestamp: string;
}

export interface SystemSettings {
  elevatorThreshold: number;
  gasThreshold: number;
  alarmThreshold: number;
}

