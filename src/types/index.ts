export interface GaitMetrics {
  strideLength: number;
  gaitSpeed: number;
  cycleSymmetry: number;
  balance: number;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  riskScore: number;
}

export interface Session {
  id: string;
  duration: number;
  metrics: GaitMetrics[];
  alerts: Alert[];
  startTime: Date;
  endTime?: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
  totalSessions: number;
  riskScore: number;
}