import { Form, Input, Modal, message } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"

export type ProtectedFieldRevealTarget = {
  resource: string
  recordId: string
  fieldKey: string
  label: string
}

export function ProtectedFieldRevealModal({
  target,
  onClose,
  onRevealed,
}: {
  target: ProtectedFieldRevealTarget | null
  onClose: () => void
  onRevealed: (target: ProtectedFieldRevealTarget, value: unknown) => void
}) {
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => setPin(""), [target])

  async function reveal() {
    if (!target) return
    setLoading(true)
    try {
      const response = await api.post(`/records/${target.resource}/${target.recordId}/reveal-field`, {
        fieldKey: target.fieldKey,
        pin,
      })
      onRevealed(target, response.data.data.value)
      onClose()
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể xác thực mã PIN"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      destroyOnHidden
      maskClosable={false}
      open={Boolean(target)}
      title={`Xem ${target?.label || "giá trị bảo mật"}`}
      okText="Xác thực và xem"
      cancelText="Hủy"
      confirmLoading={loading}
      onOk={() => void reveal()}
      onCancel={onClose}
    >
      <Form layout="vertical">
        <Form.Item label="Mã PIN" required>
          <Input.Password autoFocus inputMode="numeric" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} onPressEnter={() => void reveal()} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
