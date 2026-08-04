import { FullscreenOutlined } from "@ant-design/icons"
import { Button, Space, Tooltip, Typography } from "antd"
import type { ReactNode } from "react"

interface ModalTitleBarProps {
  title: ReactNode
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function ModalTitleBar({ title, fullscreen = false, onToggleFullscreen }: ModalTitleBarProps) {
  return (
    <div className="quick-drawer-titlebar">
      <Typography.Text strong>{title}</Typography.Text>
      {onToggleFullscreen ? (
        <Space size={8}>
          <Tooltip title={fullscreen ? "Thu nhỏ popup" : "Phóng to popup"}>
            <Button ghost icon={<FullscreenOutlined />} onClick={onToggleFullscreen} />
          </Tooltip>
        </Space>
      ) : null}
    </div>
  )
}
