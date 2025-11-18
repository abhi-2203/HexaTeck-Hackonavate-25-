export interface InterviewSettings {
  jobRole: string;
  experience: string;
  interviewType: string;
  difficulty: string;
  duration: string;
}

export interface Question {
  question: string;
  type: 'Behavioral' | 'Technical' | 'Situational';
}

export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AnalysisReport {
  id: string;
  date: string;
  overallScore: number;
  clarityOfCommunication: {
    score: number;
    feedback: string;
  };
  technicalProficiency: {
    score: number;
    feedback: string;
  };
  behavioralCompetency: {
    score: number;
    feedback: string;
  };
  confidenceAndDemeanor: {
    score: number;
    feedback: string;
  };
  strengths: string[];
  areasForImprovement: string[];
}

export type AnalysisReportData = Omit<AnalysisReport, 'id' | 'date'>;

export type Theme = 'light' | 'dark';

export type AppState = 'landing' | 'login' | 'dashboard' | 'profile' | 'setup' | 'session' | 'review' | 'analyzing' | 'report';