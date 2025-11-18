import React, { useState, useCallback, useEffect } from 'react';
import type { AppState, InterviewSettings, Question, AnalysisReport, User, Theme } from './types';
import { Header } from './components/ui/Header';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { ProfilePage } from './components/ProfilePage';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewSession } from './components/InterviewSession';
import { ReportPage } from './components/ReportPage';
import { AnswerReview } from './components/AnswerReview';
import { Spinner } from './components/ui/Spinner';
import { Card } from './components/ui/Card';
import { analyzeInterview } from './services/geminiService';
import { getCurrentUser, login, logout } from './services/authService';
import { saveInterviewReport } from './services/historyService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  
  const [settings, setSettings] = useState<InterviewSettings | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setAppState('dashboard');
    } else {
      setAppState('landing');
    }
    setIsAuthChecked(true);

    let savedTheme: Theme | null = null;
    if (typeof localStorage !== 'undefined') {
      savedTheme = localStorage.getItem('hexatech_theme') as Theme | null;
    }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hexatech_theme', theme);
    }
  }, [theme]);
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Effect to handle invalid states and redirect
  useEffect(() => {
    if (appState === 'review' && !recordedBlob) {
        console.warn('In review state without a recording. Redirecting to dashboard.');
        setAppState('dashboard');
    }
    if (appState === 'report' && (!report || !recordedBlob)) {
        console.warn('In report state without a report or recording. Redirecting to dashboard.');
        setAppState('dashboard');
    }
  }, [appState, recordedBlob, report]);

  const resetInterviewState = () => {
      setSettings(null);
      setQuestions([]);
      setRecordedBlob(null);
      setReport(null);
  }

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAppState('dashboard');
  };
  
  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    resetInterviewState();
    setAppState('landing');
  };

  const handleNavigate = (page: AppState) => {
    if (page === 'setup') {
      resetInterviewState();
    }
    setAppState(page);
  };

  const handleSetupComplete = (
    newSettings: InterviewSettings,
    newQuestions: Question[],
  ) => {
    setSettings(newSettings);
    setQuestions(newQuestions);
    setAppState('session');
  };

  const handleInterviewComplete = (videoBlob: Blob) => {
    setRecordedBlob(videoBlob);
    setAppState('review');
  };

  const handleStartAnalysis = useCallback(async (userAnswers: { [key: number]: string }) => {
    setAppState('analyzing');
    if (settings && questions.length > 0) {
        const analysisReportData = await analyzeInterview(questions, settings, userAnswers);
        const completeReport: AnalysisReport = {
          ...analysisReportData,
          id: new Date().toISOString() + Math.random().toString(36).substring(2),
          date: new Date().toISOString(),
        }
        saveInterviewReport(completeReport);
        setReport(completeReport);
        setAppState('report');
    } else {
        console.error("Settings or questions are missing for analysis.");
        setAppState('setup');
    }
  }, [settings, questions]);

  const renderContent = () => {
    if (!isAuthChecked) {
        return (
             <div className="min-h-screen flex items-center justify-center">
                <Spinner text="Loading Hexatech..." />
            </div>
        )
    }

    if (!currentUser) {
        switch(appState) {
            case 'login':
                return <LoginPage onLogin={handleLogin} onBack={() => setAppState('landing')} />;
            default:
                return <LandingPage onStart={() => setAppState('login')} />;
        }
    }
    
    // Authenticated user routes
    switch (appState) {
      case 'dashboard':
        return <DashboardPage user={currentUser} onStartInterview={() => handleNavigate('setup')} />;
      case 'profile':
        return <ProfilePage user={currentUser} onLogout={handleLogout} />;
      case 'setup':
        return <InterviewSetup onSetupComplete={handleSetupComplete} />;
      case 'session':
        return <InterviewSession questions={questions} onInterviewComplete={handleInterviewComplete} />;
      case 'review':
        return recordedBlob ? (
            <AnswerReview questions={questions} videoBlob={recordedBlob} onStartAnalysis={handleStartAnalysis} />
        ) : null;
      case 'analyzing':
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <Card>
                    <Spinner text="Analyzing your performance..." />
                    <p className="mt-4 text-center text-gray-500 dark:text-gray-400">Our AI coach is reviewing your interview to provide feedback.</p>
                </Card>
            </div>
        );
      case 'report':
        return report && recordedBlob ? (
          <ReportPage report={report} videoBlob={recordedBlob} onGoToDashboard={() => handleNavigate('dashboard')} />
        ) : null;
      default:
         return <DashboardPage user={currentUser} onStartInterview={() => handleNavigate('setup')} />;
    }
  };

  return (
    <div className="font-sans">
      <Header user={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;