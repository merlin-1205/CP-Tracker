// src/lib/data.ts
export type ActivityType = 'problem' | 'contest';

export interface BaseActivity {
  id: string;
  title: string;
  type: ActivityType;
  link?: string | null;
  notes?: string | null;
  createdAt: string; 
  timestamp?: any; 
}

export interface ProblemActivity extends BaseActivity {
  type: 'problem';
  rating: string;
  timeTaken: number;
  submissions: number;
  tags: string[];
}

export interface ContestActivity extends BaseActivity {
  type: 'contest';
  solvedCount: number;
  rank: string | null;
  attachmentUrl: string | null;
}

export type CPActivity = ProblemActivity | ContestActivity;