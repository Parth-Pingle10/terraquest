import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';

// Pages
import { ExplorePage } from './pages/ExplorePage';
import { MapPage } from './pages/MapPage';
import { QuestsPage } from './pages/QuestsPage';
import { SignatureQuestPage } from './pages/SignatureQuestPage';
import { SkillsPage } from './pages/SkillsPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedMapViewPage } from './pages/SharedMapViewPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AuthPage } from './pages/AuthPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<ExplorePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/signature-quest" element={<SignatureQuestPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/shared/:shareToken" element={<SharedMapViewPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
