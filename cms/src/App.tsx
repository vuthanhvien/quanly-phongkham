import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { ConfigProvider, theme } from 'antd';
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
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#e889ae',
          colorInfo: '#d7a45b',
          colorBgBase: '#08070b',
          colorTextBase: '#fff7fb',
          borderRadius: 18,
          fontFamily: '"Plus Jakarta Sans", Inter, Arial, sans-serif',
        },
        components: {
          Button: { controlHeight: 42, borderRadius: 999, fontWeight: 700 },
          Card: { borderRadiusLG: 24, paddingLG: 24 },
          Input: { controlHeight: 42 },
          InputNumber: { controlHeight: 42 },
          Select: { controlHeight: 42 },
          Table: { borderColor: 'rgba(255, 255, 255, 0.08)', headerBg: '#17101b', headerColor: '#f7d9e6' },
        },
      }}
    >
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
    </ConfigProvider>
  );
}
