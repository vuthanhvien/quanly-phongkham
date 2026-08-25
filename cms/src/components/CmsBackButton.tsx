import { ArrowLeftOutlined } from "@ant-design/icons"
import { Button, Tooltip } from "antd"
import { useNavigate } from "react-router-dom"

export function CmsBackButton({ to, onClick, title = "Quay lại" }: { to?: string; onClick?: () => void; title?: string }) {
  const navigate = useNavigate()
  return (
    <Tooltip title={title}>
      <Button
        aria-label={title}
        className="detail-header-ghost-button"
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => onClick ? onClick() : to ? navigate(to) : navigate(-1)}
      />
    </Tooltip>
  )
}
