import { useLogin } from "@refinedev/core"
import { Alert, Button, Card, Form, Input } from "antd"
import { useState } from "react"

export function LoginPage() {
  const { mutateAsync: login, isPending } = useLogin()
  const [loginError, setLoginError] = useState<string | null>(null)

  async function handleSubmit(values: { identifier: string; password: string }) {
    setLoginError(null)
    const result = await login(values)
    if (result?.success === false) {
      setLoginError(result.error?.message || "Đăng nhập thất bại")
    }
  }

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
            onFinish={handleSubmit}
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
            {loginError ? (
              <Alert
                showIcon
                style={{ marginTop: 14 }}
                message={loginError}
                type="error"
              />
            ) : null}
          </Form>
        </Card>
      </div>
    </div>
  )
}
