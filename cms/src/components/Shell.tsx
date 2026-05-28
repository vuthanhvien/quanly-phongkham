import { useLogout } from '@refinedev/core';
import { Button, Layout, Menu, Space, Tag, Typography } from 'antd';
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
    <Layout className="app-shell">
      <Sider className="app-sider" width={282} theme="dark">
        <div className="brand-card">
          <div className="brand-mark">TC</div>
          <div>
            <Typography.Text className="brand-kicker">Aesthetic Clinic</Typography.Text>
            <Typography.Title level={4}>Thiện Chánh</Typography.Title>
          </div>
        </div>
        <Menu className="side-menu" items={items} selectedKeys={[selected]} mode="inline" theme="dark" />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>
            <Typography.Text className="eyebrow">CMS vận hành viện thẩm mỹ</Typography.Text>
            <Typography.Title level={3}>Không gian quản trị</Typography.Title>
          </div>
          <Space>
            <Tag className="soft-tag">Live</Tag>
            <Button onClick={() => logout()}>Đăng xuất</Button>
          </Space>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
