import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { authProvider, dataProvider } from './api';
import { Shell } from './components/Shell';
import { entityLabels } from './models';
import { AuditPage } from './pages/AuditPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RecordFormPage } from './pages/RecordFormPage';
import { RecordListPage } from './pages/RecordListPage';
import { SettingsPage } from './pages/SettingsPage';

const resources = Object.entries(entityLabels).map(([name, label]) => ({
  name,
  list: `/${name}`,
  create: `/${name}/create`,
  edit: `/${name}/:id/edit`,
  meta: { label },
}));

function ProtectedLayout() {
  return (
    <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
      <Shell><Outlet /></Shell>
    </Authenticated>
  );
}

export function App() {
  return (
    <Refine dataProvider={dataProvider} authProvider={authProvider} routerProvider={routerProvider} resources={resources}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit-logs" element={<AuditPage />} />
          <Route path="/:resource" element={<RecordListPage />} />
          <Route path="/:resource/create" element={<RecordFormPage />} />
          <Route path="/:resource/:id/edit" element={<RecordFormPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Refine>
  );
}

