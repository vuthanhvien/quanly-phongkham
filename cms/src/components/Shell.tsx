import { useLogout } from '@refinedev/core';
import { Button, Layout, Menu, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { entityLabels } from '../models';

const { Header, Content, Sider } = Layout;

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { mutate: logout } = useLogout();
  const items = [
    { key: '/', label: <Link to="/">Tổng quan</Link> },
    ...Object.entries(entityLabels).map(([key, label]) => ({
      key: `/${key}`,
      label: <Link to={`/${key}`}>{label}</Link>,
    })),
    { key: '/settings', label: <Link to="/settings">Cấu hình động</Link> },
    { key: '/audit-logs', label: <Link to="/audit-logs">Audit log</Link> },
  ];
  const selected = items.find((item) => item.key !== '/' && location.pathname.startsWith(item.key))?.key || '/';
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={246} theme="light">
        <Typography.Title level={4} style={{ padding: 22, margin: 0, color: '#234273' }}>
          THIỆN CHÁNH CMS
        </Typography.Title>
        <Menu items={items} selectedKeys={[selected]} mode="inline" />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button onClick={() => logout()}>Đăng xuất</Button>
        </Header>
        <Content style={{ padding: 28 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}

