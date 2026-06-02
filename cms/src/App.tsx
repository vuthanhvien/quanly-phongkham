import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { ConfigProvider, theme } from 'antd';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { hasResourceAccess, hasScreenAccess } from './access';
import { authProvider, dataProvider } from './api';
import { Shell } from './components/Shell';
import { entityLabels } from './models';
import { AuditPage } from './pages/AuditPage';
import { BranchRoleAssignmentsPage } from './pages/BranchRoleAssignmentsPage';
import { CustomFieldsPage } from './pages/CustomFieldsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { LandingPagesPage } from './pages/LandingPagesPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { RecordFormPage } from './pages/RecordFormPage';
import { RecordListPage } from './pages/RecordListPage';
import { RolesPage } from './pages/RolesPage';
import { SettingsPage } from './pages/SettingsPage';

const resources = Object.entries(entityLabels).map(([name, label]) => ({
  name,
  list: `/${name}`,
  edit: `/${name}/:id/edit`,
  show: `/${name}/:id`,
  meta: { label },
}));

function ProtectedLayout() {
  return (
    <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
      <Shell><Outlet /></Shell>
    </Authenticated>
  );
}

function ScreenGuard({ screen }: { screen: string }) {
  return hasScreenAccess(screen) ? <Outlet /> : <Navigate to="/" replace />;
}

function ResourceGuard() {
  const { resource = '' } = useParams();
  return hasResourceAccess(resource) ? <Outlet /> : <Navigate to="/" replace />;
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
          borderRadius: 14,
          fontFamily: '"Plus Jakarta Sans", Inter, Arial, sans-serif',
        },
        components: {
          Button: { controlHeight: 38, borderRadius: 999, fontWeight: 700 },
          Card: { borderRadiusLG: 20, paddingLG: 18 },
          Input: { controlHeight: 38 },
          InputNumber: { controlHeight: 38 },
          Select: { controlHeight: 38 },
          Table: {
            borderColor: 'rgba(255, 255, 255, 0.08)',
            cellPaddingBlock: 10,
            cellPaddingInline: 12,
            cellPaddingBlockSM: 8,
            cellPaddingInlineSM: 10,
            headerBg: '#17101b',
            headerColor: '#f7d9e6'
          },
        },
      }}
    >
      <Refine dataProvider={dataProvider} authProvider={authProvider} routerProvider={routerProvider} resources={resources}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<DashboardPage />} />
            <Route element={<ScreenGuard screen="settings" />}>
              <Route path="/custom-fields" element={<CustomFieldsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/landing-pages" element={<LandingPagesPage />} />
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/branch-role-assignments" element={<BranchRoleAssignmentsPage />} />
            </Route>
            <Route element={<ScreenGuard screen="audit-logs" />}>
              <Route path="/audit-logs" element={<AuditPage />} />
            </Route>
            <Route element={<ResourceGuard />}>
              <Route path="/:resource" element={<RecordListPage />} />
              <Route path="/:resource/:id/edit" element={<RecordFormPage />} />
              <Route path="/:resource/:id" element={<RecordDetailPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Refine>
    </ConfigProvider>
  );
}
