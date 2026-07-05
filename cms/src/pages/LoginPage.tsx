import { useLogin } from "@refinedev/core"
import { Button, Card, Form, Input } from "antd"

export function LoginPage() {
  const { mutate: login, isPending } = useLogin()
  return (
    <div className="login-shell">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <div className="login-panel">
        <div className="login-brand-outside">
          <div className="brand-mark login-brand-mark">TC</div>
        </div>
        <Card className="login-card">
          <Form
            layout="vertical"
            initialValues={{
              identifier: "admin@thienchanh.local",
              password: "Admin@123",
            }}
            onFinish={(values) => login(values)}
          >
            <Form.Item label="Email / tên đăng nhập / mã NV / SĐT" name="identifier" rules={[{ required: true }]}>
              <Input placeholder="Nhập email, tên đăng nhập, mã nhân viên hoặc số điện thoại" />
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
    </div>
  )
}
