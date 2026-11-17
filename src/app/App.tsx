import { Route, Routes } from 'react-router-dom';

import { getConfig } from '../config/env';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App() {
  const { appEnv, firebase } = getConfig();
  const showDevBanner = appEnv !== 'production' || firebase.useEmulator;

  return (
    <div className="app">
      {showDevBanner && (
        <div className="dev-banner" role="status">
          DEV — ข้อมูลทดสอบเท่านั้น
        </div>
      )}
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
