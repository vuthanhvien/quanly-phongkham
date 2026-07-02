import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { ConfigProvider, theme } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { hasResourceAccess, hasScreenAccess } from './access';
import { AppUiContext, cardPaddingBySize, controlHeightBySize, defaultAppUiSettings, loadCachedAppUiSettings, normalizeAppUiSettings, persistAppUiSettings, syncDocumentBranding, tablePaddingBySize, useAppUi, type AppUiSettings } from './app-ui';
import { authProvider, dataProvider, api } from './api';
import { Shell } from './components/Shell';
import { entityLabels } from './models';
import { AuditPage } from './pages/AuditPage';
import { CustomFieldsPage } from './pages/CustomFieldsPage';
import { DashboardPage } from './pages/DashboardPage';
import { FileFoldersPage } from './pages/FileFoldersPage';
import { LoginPage } from './pages/LoginPage';
import { LandingPagesPage } from './pages/LandingPagesPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { RecordFormPage } from './pages/RecordFormPage';
import { RecordImportPage } from './pages/RecordImportPage';
import { RecordListPage } from './pages/RecordListPage';
import { ProfilePage } from './pages/ProfilePage';
import { RolesPage } from './pages/RolesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatbotSettingsPage } from './pages/ChatbotSettingsPage';
import { LandingThemePage } from './pages/LandingThemePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { PayrollsPage } from './pages/PayrollsPage';
import { UiSettingsPage } from './pages/UiSettingsPage';
import { ZaloInboxPage } from './pages/ZaloInboxPage';

const resources = Object.entries(entityLabels).map(([name, label]) => ({
  name,
  list: `/${name}`,
  edit: `/${name}/:id/edit`,
  show: `/${name}/:id`,
  meta: { label },
}));

function ProtectedLayout() {
  const { refresh } = useAppUi();

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
  const [appUiSettings, setAppUiSettings] = useState<AppUiSettings>(() => loadCachedAppUiSettings());
  const [uiLoading, setUiLoading] = useState(false);

  useEffect(() => {
    void loadAppUiSettings();
  }, []);

  useEffect(() => {
    syncDocumentBranding(appUiSettings);
    persistAppUiSettings(appUiSettings);
  }, [appUiSettings]);

  const loadAppUiSettings = useCallback(async () => {
    setUiLoading(true);
    try {
      const response = await api.get('/settings/app-ui');
      setAppUiSettings(normalizeAppUiSettings(response.data.data));
    } catch {
      setAppUiSettings((current) => current || defaultAppUiSettings);
    } finally {
      setUiLoading(false);
    }
  }, []);

  const saveAppUiSettings = useCallback(async (payload: Partial<AppUiSettings>) => {
    const response = await api.patch('/settings/app-ui', payload);
    const next = normalizeAppUiSettings(response.data.data);
    setAppUiSettings(next);
    return next;
  }, []);

  const controlHeight = controlHeightBySize(appUiSettings.size);
  const cardPadding = cardPaddingBySize(appUiSettings.size);
  const tablePadding = tablePaddingBySize(appUiSettings.size);

  return (
    <AppUiContext.Provider
      value={{
        settings: appUiSettings,
        loading: uiLoading,
        refresh: loadAppUiSettings,
        save: saveAppUiSettings,
      }}
    >
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: appUiSettings.primaryColor,
            colorInfo: appUiSettings.primaryColor,
            colorBgBase: appUiSettings.pageBgColor,
            colorBgContainer: appUiSettings.surfaceColor,
            colorBgElevated: appUiSettings.surfaceColor,
            colorBorder: appUiSettings.surfaceBorderColor,
            colorTextBase: appUiSettings.textColor,
            colorText: appUiSettings.textColor,
            colorTextSecondary: appUiSettings.textMutedColor,
            colorTextHeading: appUiSettings.titleColor,
            borderRadius: appUiSettings.borderRadius,
            fontFamily: appUiSettings.fontFamily,
          },
          components: {
            Button: {
              controlHeight,
              borderRadius: appUiSettings.borderRadius,
              fontWeight: 700,
              primaryColor: appUiSettings.buttonPrimaryTextColor,
              defaultBg: appUiSettings.buttonDefaultBgColor,
              defaultColor: appUiSettings.buttonDefaultTextColor,
              defaultBorderColor: appUiSettings.buttonDefaultBorderColor,
            },
            Card: {
              borderRadius: appUiSettings.borderRadius,
              borderRadiusLG: appUiSettings.borderRadius,
              paddingLG: cardPadding,
              boxShadowTertiary: 'var(--app-shadow-soft)',
            },
            Input: { controlHeight },
            InputNumber: { controlHeight },
            Select: { controlHeight },
            Menu: {
              itemBorderRadius: appUiSettings.borderRadius,
              subMenuItemBorderRadius: Math.max(0, appUiSettings.borderRadius - 2),
            },
            Table: {
              borderColor: appUiSettings.surfaceBorderColor,
              cellPaddingBlock: tablePadding.block,
              cellPaddingInline: tablePadding.inline,
              cellPaddingBlockSM: Math.max(6, tablePadding.block - 2),
              cellPaddingInlineSM: Math.max(8, tablePadding.inline - 2),
              headerBg: appUiSettings.surfaceColor,
              headerColor: appUiSettings.titleColor
            },
            Tag: {
              borderRadiusSM: Math.max(6, appUiSettings.borderRadius - 4),
            },
          },
        }}
      >
        <Refine dataProvider={dataProvider} authProvider={authProvider} routerProvider={routerProvider} resources={resources}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route element={<ScreenGuard screen="zalo-inbox" />}>
                <Route path="/zalo-inbox" element={<ZaloInboxPage />} />
              </Route>
              <Route element={<ScreenGuard screen="settings" />}>
                <Route path="/custom-fields" element={<CustomFieldsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/landing-pages" element={<LandingPagesPage />} />
                <Route path="/chatbot-settings" element={<ChatbotSettingsPage />} />
                <Route path="/landing-theme" element={<LandingThemePage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/branch-role-assignments" element={<Navigate to="/roles" replace />} />
                <Route path="/ui-settings" element={<UiSettingsPage />} />
              </Route>
              <Route element={<ScreenGuard screen="audit-logs" />}>
                <Route path="/audit-logs" element={<AuditPage />} />
              </Route>
              <Route element={<ResourceGuard />}>
                <Route path="/file-folders" element={<FileFoldersPage />} />
                <Route path="/product-categories" element={<CategoriesPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/payrolls" element={<PayrollsPage />} />
                <Route path="/:resource" element={<RecordListPage />} />
                <Route path="/:resource/import" element={<RecordImportPage />} />
                <Route path="/:resource/:id/edit" element={<RecordFormPage />} />
                <Route path="/:resource/:id" element={<RecordDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Refine>
      </ConfigProvider>
    </AppUiContext.Provider>
  );
}
