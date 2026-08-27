import { Button, List, Modal } from "antd"
import { InboxOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { useState } from "react"
import { api } from "../api"
import { toastError, toastSuccess } from "../toast"
import { getApiErrorMessage } from "../utils/apiError"

type RecordDraft = {
  id: string
  title?: string
  payload: Record<string, unknown>
  updatedAt: string
}

interface RecordDraftControlsProps {
  resource: string
  getPayload: () => Record<string, unknown>
  onRestore: (payload: Record<string, unknown>) => void
}

/** Draft actions are intentionally outside Form validation. */
export function RecordDraftControls({ resource, getPayload, onRestore }: RecordDraftControlsProps) {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<RecordDraft[]>([])
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    try {
      const response = await api.get(`/records/${resource}/drafts`)
      setDrafts(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể tải bản nháp"))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      const response = await api.post(`/records/${resource}/drafts`, getPayload())
      const draft = response.data?.data as RecordDraft | undefined
      if (draft) setDrafts((current) => [draft, ...current])
      toastSuccess("Đã lưu bản nháp")
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể lưu bản nháp"))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      await api.delete(`/records/${resource}/drafts/${id}`)
      setDrafts((current) => current.filter((draft) => draft.id !== id))
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể xóa bản nháp"))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <Button loading={busy} onClick={() => void save()}>Lưu nháp</Button>
    <Button onClick={() => { setOpen(true); void load() }}>Bản nháp{drafts.length ? ` (${drafts.length})` : ""}</Button>
    <Modal footer={null} onCancel={() => setOpen(false)} open={open} title="Bản nháp">
      <List
        dataSource={drafts}
        loading={busy}
        locale={{ emptyText: "Chưa có bản nháp nào" }}
        renderItem={(draft) => <List.Item actions={[
          <Button key="open" size="small" type="primary" onClick={() => { onRestore(draft.payload); setOpen(false); toastSuccess("Đã mở bản nháp") }}>Mở</Button>,
          <Button icon={<InboxOutlined />} key="delete" size="small" onClick={() => void remove(draft.id)}>Lưu trữ</Button>,
        ]}>
          <List.Item.Meta title={draft.title || "Bản nháp chưa đặt tên"} description={`Cập nhật ${dayjs(draft.updatedAt).format("DD/MM/YYYY HH:mm")}`} />
        </List.Item>}
      />
    </Modal>
  </>
}
