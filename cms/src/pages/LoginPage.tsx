import { useLogin } from "@refinedev/core"
import { Button, Card, Form, Input, Typography } from "antd"

export function LoginPage() {
  const { mutate: login, isPending } = useLogin()
  return (
    <div className="login-shell">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <Card className="login-card">
        <div className="brand-card login-brand">
          <div className="brand-mark">TC</div>
          <div>
            <Typography.Text className="brand-kicker">
              Aesthetic Clinic
            </Typography.Text>
            <Typography.Title level={3}>Thiện Chánh CMS</Typography.Title>
          </div>
        </div>
        <Typography.Paragraph className="login-copy">
          Quản lý khách hàng, hồ sơ điều trị, kho, lịch hẹn và cấu hình động cho
          viện thẩm mỹ.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          initialValues={{
            email: "admin@thienchanh.local",
            password: "Admin@123",
          }}
          onFinish={(values) => login(values)}
        >
          <Form.Item label="Email" name="email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Button
            block
            className="primary-glow"
            htmlType="submit"
            loading={isPending}
            type="primary"
          >
            Đăng nhập CMS
          </Button>
        </Form>
      </Card>
    </div>
  )
}
