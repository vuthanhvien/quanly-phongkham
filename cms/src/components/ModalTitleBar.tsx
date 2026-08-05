import { Typography } from "antd"
import type { ReactNode } from "react"

interface ModalTitleBarProps {
  title: ReactNode
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function ModalTitleBar({ title }: ModalTitleBarProps) {
  return (
    <div className="quick-drawer-titlebar">
      <Typography.Text strong>{title}</Typography.Text>
    </div>
  )
}
