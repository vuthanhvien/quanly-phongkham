import {
  BgColorsOutlined,
  CodeOutlined,
  FontSizeOutlined,
  LayoutOutlined,
} from "@ant-design/icons"
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { useWatch } from "antd/es/form/Form"

interface ThemePreset {
  key: string
  label: string
  description: string
  preview: { bg: string; surface: string; accent: string; ink: string }
}

interface ThemeSettings {
  id?: string
  themeKey: string
  accent?: string
  fontFamily?: string
  borderRadius?: number
  customCss?: string
  updatedAt?: string
}

const FONT_OPTIONS = [
  { value: "", label: "Mặc định (theo theme)" },
  {
    value: '"Avenir Next","Segoe UI Variable","Helvetica Neue",sans-serif',
    label: "Avenir / Helvetica (Sans)",
  },
  {
    value: 'Georgia,"Palatino Linotype",serif',
    label: "Georgia / Palatino (Serif)",
  },
  {
    value: 'Inter,"Segoe UI Variable",system-ui,sans-serif',
    label: "Inter (Modern Sans)",
  },
  {
    value: '"Space Grotesk",system-ui,sans-serif',
    label: "Space Grotesk (Geometric)",
  },
  {
    value: '"DM Sans","Helvetica Neue",sans-serif',
    label: "DM Sans (Rounded)",
  },
  {
    value: '"Courier New","Lucida Console",monospace',
    label: "Courier (Monospace)",
  },
]

function ThemeCard({
  preset,
  selected,
  onClick,
}: {
  preset: ThemePreset
  selected: boolean
  onClick: () => void
}) {
  const { bg, surface, accent, ink } = preset.preview
  return (
    <Card
      onClick={onClick}
      hoverable
      style={{
        cursor: "pointer",
        border: selected ? `2px solid ${accent}` : "2px solid transparent",
        background: selected ? `${accent}10` : undefined,
        transition: "all .18s",
      }}
      bodyStyle={{ padding: 14 }}
    >
      {/* Mini preview */}
      <div
        style={{
          height: 90,
          borderRadius: 8,
          background: bg,
          overflow: "hidden",
          marginBottom: 10,
          position: "relative",
        }}
      >
        {/* fake hero block */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            height: 36,
            background: surface,
            borderRadius: 4,
            border: `1px solid ${accent}30`,
          }}
        >
          <div
            style={{
              width: "60%",
              height: 6,
              background: ink,
              borderRadius: 3,
              margin: "8px 8px 4px",
            }}
          />
          <div
            style={{
              width: "40%",
              height: 4,
              background: `${ink}60`,
              borderRadius: 3,
              margin: "0 8px",
            }}
          />
        </div>
        {/* fake blocks */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            display: "flex",
            gap: 4,
          }}
        >
          <div
            style={{
              flex: 2,
              height: 20,
              background: surface,
              borderRadius: 3,
              border: `1px solid ${accent}25`,
            }}
          />
          <div
            style={{
              flex: 1,
              height: 20,
              background: accent,
              borderRadius: 3,
              opacity: 0.85,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <Typography.Text strong style={{ fontSize: 13 }}>
          {preset.label}
        </Typography.Text>
        {selected && (
          <Tag
            color={accent}
            style={{ fontSize: 11, padding: "0 6px", margin: 0 }}
          >
            Đang dùng
          </Tag>
        )}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {preset.description}
      </Typography.Text>
    </Card>
  )
}

export function LandingThemeEditor() {
  const [form] = Form.useForm<ThemeSettings>()
  const [presets, setPresets] = useState<ThemePreset[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedKey, setSelectedKey] = useState("warm-classic")
  const accentValue = (useWatch("accent", form) as string) ?? ""

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [settingsRes, presetsRes] = await Promise.all([
        api.get("/settings/landing-theme"),
        api.get("/settings/landing-theme/presets"),
      ])
      const data = settingsRes.data.data as ThemeSettings
      setSelectedKey(data.themeKey ?? "warm-classic")
      form.setFieldsValue({
        themeKey: data.themeKey ?? "warm-classic",
        accent: data.accent ?? "",
        fontFamily: data.fontFamily ?? "",
        borderRadius: data.borderRadius,
        customCss: data.customCss ?? "",
      })
      setPresets(presetsRes.data.data as ThemePreset[])
    } catch {
      message.error("Không thể tải cấu hình theme")
    } finally {
      setLoading(false)
    }
  }

  async function save(values: ThemeSettings) {
    setSaving(true)
    try {
      const payload: Partial<ThemeSettings> = {
        themeKey: selectedKey,
        accent: values.accent || undefined,
        fontFamily: values.fontFamily || undefined,
        borderRadius: values.borderRadius ?? undefined,
        customCss: values.customCss || undefined,
      }
      await api.put("/settings/landing-theme", payload)
      message.success("Đã lưu theme landing page")
    } catch {
      message.error("Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  const apiBase =
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_API_URL ?? "http://localhost:3000/api"
  const cssUrl = `${apiBase}/public/landing-theme/style.css`

  return (
    <Form form={form} layout="vertical" onFinish={save}>
      <Card
        className="glass-card"
        loading={loading}
        title={
          <Space>
            <LayoutOutlined />
            Chọn bộ giao diện
          </Space>
        }
        style={{ marginBottom: 20 }}
      >
        <Alert
          type="info"
          showIcon
          message="CSS được tải động từ CMS"
          description={
            <>
              Landing page tải stylesheet từ{" "}
              <a href={cssUrl} target="_blank" rel="noreferrer">
                {cssUrl}
              </a>
              . Sau khi lưu, reload landing page để thấy thay đổi.
            </>
          }
          style={{ marginBottom: 20 }}
        />

        <Row gutter={[16, 16]}>
          {presets.map((p) => (
            <Col key={p.key} xs={24} sm={12} md={8} lg={8} xl={8}>
              <ThemeCard
                preset={p}
                selected={selectedKey === p.key}
                onClick={() => {
                  setSelectedKey(p.key)
                  form.setFieldValue("themeKey", p.key)
                }}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        className="glass-card"
        title={
          <Space>
            <BgColorsOutlined />
            Tùy chỉnh
          </Space>
        }
        style={{ marginBottom: 20 }}
      >
        <Row gutter={24}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="accent"
              label="Màu accent"
              extra="Hex color code, ví dụ #bd4f2f. Để trống để dùng màu mặc định của theme."
            >
              <Space.Compact style={{ width: "100%" }}>
                <input
                  type="color"
                  value={
                    accentValue.match(/^#[0-9a-f]{6}$/i)
                      ? accentValue
                      : "#bd4f2f"
                  }
                  onChange={(e) => form.setFieldValue("accent", e.target.value)}
                  style={{
                    width: 44,
                    height: 32,
                    border: "1px solid #d9d9d9",
                    cursor: "pointer",
                    padding: 2,
                    borderRadius: "6px 0 0 6px",
                    background: "white",
                  }}
                />
                <Form.Item name="accent" noStyle>
                  <Input
                    placeholder="#bd4f2f (để trống = mặc định theme)"
                    style={{ borderRadius: "0 6px 6px 0" }}
                  />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="fontFamily"
              label={
                <Space>
                  <FontSizeOutlined />
                  Font chữ
                </Space>
              }
              extra="Font cho body text. Heading font do theme quyết định."
            >
              <Select
                options={FONT_OPTIONS}
                placeholder="Mặc định theo theme"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="borderRadius"
              label="Bo góc (px)"
              extra="Áp dụng cho card và block. Để trống để dùng mặc định."
            >
              <InputNumber
                min={0}
                max={80}
                style={{ width: "100%" }}
                placeholder="Mặc định theo theme"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item
          name="customCss"
          label={
            <Space>
              <CodeOutlined />
              Custom CSS
            </Space>
          }
          extra="CSS tùy chỉnh thêm. Được append sau CSS của theme. Có thể override bất kỳ style nào."
        >
          <Input.TextArea
            rows={10}
            placeholder={`/* Ví dụ: override màu nền hero */
.hero {
  background: #ffeedd !important;
}

/* Override font heading */
.hero h1 {
  font-family: "Your Custom Font", sans-serif;
}`}
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </Form.Item>
      </Card>

      <Card className="glass-card">
        <Space>
          <Button
            className="primary-glow"
            htmlType="submit"
            loading={saving}
            type="primary"
            size="large"
          >
            Lưu & áp dụng
          </Button>
          <Button size="large" onClick={() => window.open(cssUrl, "_blank")}>
            Xem CSS đang dùng
          </Button>
        </Space>
      </Card>
    </Form>
  )
}

export function LandingThemePage() {
  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Giao diện & Theme</Typography.Title>
        </div>
      </div>
      <LandingThemeEditor />
    </>
  )
}
