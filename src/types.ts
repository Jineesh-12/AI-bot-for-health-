export type StudentMood = 'Excellent' | 'Good' | 'Neutral' | 'Stressed' | 'Tired' | 'Overwhelmed';
export type ActivityLevel = 'None' | 'Light' | 'Moderate' | 'Heavy';

export interface HealthLog {
  id: string;
  date: string; // YYYY-MM-DD
  sleepHours: number;
  stressLevel: number; // 1-10
  focusMinutes: number;
  waterIntakeCups: number;
  mood: StudentMood;
  activityLevel: ActivityLevel;
  notes: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
}

export interface RecommendedAction {
  id: string;
  category: 'sleep' | 'stress' | 'focus' | 'hydration' | 'activity';
  title: string;
  description: string;
  duration: string;
  icon: string;
}
