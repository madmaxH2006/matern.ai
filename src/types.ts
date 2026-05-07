export interface Profile {
  name: string;
  age: string;
  due_date: string;
  last_period_date: string;
  notes: string;
}

export interface HealthLog {
  id: string;
  type: 'weight' | 'bp' | 'hr' | 'mood' | 'symptom' | 'kicks' | 'appointment';
  data: any;
  note?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
