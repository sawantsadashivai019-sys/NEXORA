import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Notebook from '@/pages/Notebook';
import Login from '@/pages/Login';
import Profile from '@/pages/Profile';

import ErrorBoundary from '@/components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notebook/:id" element={<Notebook />} />
        </Routes>
    </ErrorBoundary>
  );
};

export default App;
