import { useLogin } from '@refinedev/core';
import { Button, Card, Form, Input, Typography } from 'antd';

export function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  return (
    <div className="login-shell">
      <Card style={{ width: 420 }}>
        <Typography.Title level={3}>Quản lý phòng khám</Typography.Title>
        <Typography.Paragraph type="secondary">Đăng nhập CMS Thiện Chánh</Typography.Paragraph>
        <Form layout="vertical" initialValues={{ email: 'admin@thienchanh.local', password: 'Admin@123' }} onFinish={(values) => login(values)}>
          <Form.Item label="Email" name="email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button block htmlType="submit" loading={isPending} type="primary">Đăng nhập</Button>
        </Form>
      </Card>
    </div>
  );
}

