import { PictureOutlined, SearchOutlined } from "@ant-design/icons"
import { Button, Flex, Input, Modal, Spin, Tooltip, Typography } from "antd"
import { useEffect, useRef, useState } from "react"
import { api, resolveFileUrl } from "../api"

interface FileRecord {
  id: string
  publicUrl: string
  title: string
  originalName: string
  mimeType?: string
  extension?: string
}

function isImage(file: FileRecord) {
  const mime = (file.mimeType || "").toLowerCase()
  if (mime.startsWith("image/")) return true
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(
    (file.extension || "").toLowerCase(),
  )
}

interface Props {
  value?: string
  onChange?: (url: string) => void
  placeholder?: string
}

export function ImagePickerInput({ value = "", onChange, placeholder = "https://..." }: Props) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const loaded = useRef(false)

  async function loadFiles() {
    if (loaded.current) return
    setLoading(true)
    try {
      const res = await api.get("/records/files", { params: { pageSize: 500 } })
      const all = (res.data.data || []) as FileRecord[]
      setFiles(all.filter(isImage))
      loaded.current = true
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void loadFiles()
  }, [open])

  const filtered = files.filter((f) => {
    const q = search.toLowerCase()
    return !q || f.title.toLowerCase().includes(q) || f.originalName.toLowerCase().includes(q)
  })

  function pick(file: FileRecord) {
    onChange?.(resolveFileUrl(file.publicUrl))
    setOpen(false)
    setSearch("")
  }

  return (
    <>
      <Flex gap={6}>
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
        <Tooltip title="Chọn từ thư viện">
          <Button icon={<PictureOutlined />} onClick={() => setOpen(true)} />
        </Tooltip>
        {value && (
          <img
            alt="preview"
            src={value}
            style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid #d9d9d9", flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        )}
      </Flex>

      <Modal
        title="Chọn hình từ thư viện"
        open={open}
        onCancel={() => { setOpen(false); setSearch("") }}
        footer={null}
        width={760}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
          allowClear
        />
        {loading ? (
          <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>
        ) : filtered.length === 0 ? (
          <Typography.Text type="secondary">Không tìm thấy hình nào</Typography.Text>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, maxHeight: 480, overflowY: "auto" }}>
            {filtered.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => pick(file)}
                style={{
                  border: resolveFileUrl(file.publicUrl) === value ? "2px solid #1677ff" : "2px solid transparent",
                  borderRadius: 8,
                  padding: 4,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.05)",
                  textAlign: "left",
                  transition: "border-color .15s",
                }}
              >
                <img
                  alt={file.title}
                  src={resolveFileUrl(file.publicUrl)}
                  style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4, display: "block" }}
                />
                <Typography.Text
                  ellipsis
                  style={{ fontSize: 11, display: "block", marginTop: 4, color: "inherit" }}
                >
                  {file.title || file.originalName}
                </Typography.Text>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
