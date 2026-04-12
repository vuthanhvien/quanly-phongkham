"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import styled from "styled-components"
import { tokens as t } from "@/components/ui/tokens"
import { Field, TextField } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${t.colorBgNeutral};
`

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: ${t.radiusLg};
  border: 1px solid ${t.colorBorder};
  box-shadow: ${t.shadowRaised};
  overflow: hidden;
`

const CardTop = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 32px 20px;
  border-bottom: 1px solid ${t.colorBorder};
  background: ${t.colorBgNeutral};
`

const Logo = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${t.radiusLg};
  background: ${t.colorBrandBold};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 12px;
  svg {
    width: 24px;
    height: 24px;
  }
`

const CardTitle = styled.h1`
  margin: 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeXl};
  font-weight: 700;
  color: ${t.colorText};
`

const CardSub = styled.p`
  margin: 4px 0 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextSubtle};
`

const Form = styled.form`
  padding: 24px 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@phongkham.vn",
      password: "Admin@123",
    },
    // values: {
    //   email: "admin@phongkham.vn",
    //   password: "Admin@123",
    // },
  })

  useEffect(() => {
    setValue("email", "admin@phongkham.vn")
    setValue("password", "Admin@123")
  }, [])

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const result = await signIn("credentials", { ...data, redirect: false })
      if (result?.error) {
        toast.error("Email hoặc mật khẩu không đúng")
      } else {
        router.push("/admin")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page>
      <Card>
        <CardTop>
          <Logo>
            <Building2 />
          </Logo>
          <CardTitle>Phòng Khám</CardTitle>
          <CardSub>Đăng nhập để tiếp tục</CardSub>
        </CardTop>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Email" error={errors.email?.message}>
            <TextField
              type="email"
              placeholder="admin@phongkham.vn"
              autoComplete="email"
              isInvalid={!!errors.email}
              {...register("email", { required: "Vui lòng nhập email" })}
            />
          </Field>
          <Field label="Mật khẩu" error={errors.password?.message}>
            <TextField
              type="password"
              autoComplete="current-password"
              isInvalid={!!errors.password}
              {...register("password")}
            />
          </Field>
          <Button
            type="submit"
            appearance="primary"
            style={{ width: "100%", marginTop: 4, height: 36 }}
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </Form>
      </Card>
    </Page>
  )
}
