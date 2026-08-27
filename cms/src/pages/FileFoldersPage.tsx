import {
  DeleteOutlined,
  DisconnectOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  GoogleOutlined,
  InboxOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Tree,
  TreeSelect,
  Typography,
  Upload,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import type { UploadFile, UploadProps } from "antd"
import { useEffect, useMemo, useState } from "react"
import { hasActionAccess, isCurrentUserAdmin } from "../access"
import { api, resolveFileUrl } from "../api"
import { FileUploadPanel } from "../components/FileUploadPanel"
import { buildFolderPathMap, buildFolderTree, FolderTreeNode, normalizeFileFolderRows, type FileFolderRow } from "../utils/fileFolders"

interface FolderRecord extends FileFolderRow {
  description?: string
  isActive?: boolean
}

interface FileRecord {
  id: string
  folderId: string
  title: string
  originalName: string
  publicUrl: string
  mimeType?: string
  extension?: string
  sizeBytes?: number
  note?: string
  modifiedTime?: string
  thumbnailUrl?: string
}

interface GoogleDriveStatus {
  configured: boolean
  connected: boolean
  accountEmail?: string
}

interface GoogleFolderRecord {
  id: string
  name: string
  parentId: string | null
}

export function FileFoldersPage() {
  const [folders, setFolders] = useState<FolderRecord[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [fileSearch, setFileSearch] = useState("")
  const [folderSearch, setFolderSearch] = useState("")
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderRecord | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleDrive, setGoogleDrive] = useState<GoogleDriveStatus | null>(null)
  const [googleDriveLoading, setGoogleDriveLoading] = useState(false)
  const [fileSource, setFileSource] = useState<"system" | "google">("system")
  const [googleFiles, setGoogleFiles] = useState<FileRecord[]>([])
  const [googleFilesLoading, setGoogleFilesLoading] = useState(false)
  const [googleFolders, setGoogleFolders] = useState<GoogleFolderRecord[]>([])
  const [googleFoldersLoading, setGoogleFoldersLoading] = useState(false)
  const [googleExpandedKeys, setGoogleExpandedKeys] = useState<string[]>(["root"])
  const [googleFolderId, setGoogleFolderId] = useState("root")
  const [googleFolderPath, setGoogleFolderPath] = useState<Array<{ id: string; name: string }>>([])
  const [googleFolderModalOpen, setGoogleFolderModalOpen] = useState(false)
  const [googleFolderName, setGoogleFolderName] = useState("")
  const [googleRenameTarget, setGoogleRenameTarget] = useState<FileRecord | null>(null)
  const [googleUploading, setGoogleUploading] = useState(false)
  const [googleUploadOpen, setGoogleUploadOpen] = useState(false)
  const [googleUploadFileList, setGoogleUploadFileList] = useState<UploadFile[]>([])
  const [folderForm] = Form.useForm()
  const canConfigureGoogleDrive = isCurrentUserAdmin()

  useEffect(() => {
    void loadData()
    if (canConfigureGoogleDrive) void loadGoogleDriveStatus()
  }, [])

  const folderTree = useMemo(() => buildFolderTree(folders), [folders])
  const folderPathMap = useMemo(() => buildFolderPathMap(folders), [folders])
  const selectedFolder = folders.find((item) => item.id === selectedFolderId)
  const childFolders = folders
    .filter((item) => item.parentId === selectedFolderId)
    .sort((left, right) => left.name.localeCompare(right.name, "vi"))
  const directFiles = files.filter((item) => item.folderId === selectedFolderId)
  const filteredFiles = directFiles.filter((item) => {
    const keyword = fileSearch.trim().toLowerCase()
    if (!keyword) return true
    return [item.title, item.originalName, item.note, item.mimeType]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })

  const visibleTree = useMemo(
    () => filterTreeByKeyword(folderTree, folderSearch),
    [folderSearch, folderTree],
  )
  const googleFolderTree = useMemo(() => [{
    key: "root",
    title: "Thư mục gốc",
    value: "root",
    children: filterTreeByKeyword(buildFolderTree(googleFolders), folderSearch),
  }], [folderSearch, googleFolders])

  async function loadData() {
    setLoading(true)
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        api.get("/records/file-folders", { params: { pageSize: 500 } }),
        api.get("/records/files", { params: { pageSize: 500 } }),
      ])
      const nextFolders = (foldersResponse.data.data || []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        name: String(row.name || row.id),
        parentId: row.parentId ? String(row.parentId) : null,
        description: row.description ? String(row.description) : undefined,
        isActive: typeof row.isActive === "boolean" ? row.isActive : true,
      })) as FolderRecord[]
      const nextFiles = (filesResponse.data.data || []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        folderId: String(row.folderId || ""),
        title: String(row.title || row.originalName || row.id),
        originalName: String(row.originalName || row.id),
        publicUrl: String(row.publicUrl || ""),
        mimeType: row.mimeType ? String(row.mimeType) : undefined,
        extension: row.extension ? String(row.extension) : undefined,
        sizeBytes: row.sizeBytes ? Number(row.sizeBytes) : 0,
        note: row.note ? String(row.note) : undefined,
      })) as FileRecord[]
      setFolders(nextFolders)
      setFiles(nextFiles)
      setExpandedKeys((current) => current.length > 0 ? current : nextFolders.map((item) => item.id))
      setSelectedFolderId((current) => current && nextFolders.some((item) => item.id === current) ? current : nextFolders[0]?.id)
    } finally {
      setLoading(false)
    }
  }

  async function loadGoogleDriveStatus() {
    try {
      const response = await api.get("/settings/google-drive")
      setGoogleDrive(response.data.data || null)
    } catch {
      setGoogleDrive(null)
    }
  }

  async function connectGoogleDrive() {
    setGoogleDriveLoading(true)
    try {
      const response = await api.post("/settings/google-drive/connect")
      const authorizationUrl = String(response.data?.data?.authorizationUrl || "")
      if (!authorizationUrl) throw new Error("Không lấy được đường dẫn xác thực Google")
      const popup = window.open(authorizationUrl, "company-google-drive", "popup=yes,width=620,height=720")
      if (!popup) {
        message.warning("Trình duyệt đang chặn popup. Hãy cho phép popup rồi thử lại.")
        return
      }
      const startedAt = Date.now()
      const timer = window.setInterval(() => {
        if (popup.closed || Date.now() - startedAt > 5 * 60 * 1000) {
          window.clearInterval(timer)
          void loadGoogleDriveStatus()
        }
      }, 800)
    } finally {
      setGoogleDriveLoading(false)
    }
  }

  async function disconnectGoogleDrive() {
    setGoogleDriveLoading(true)
    try {
      await api.post("/settings/google-drive/disconnect")
      await loadGoogleDriveStatus()
      message.success("Đã ngắt kết nối Google Drive")
    } finally {
      setGoogleDriveLoading(false)
    }
  }

  async function loadGoogleFiles(query = fileSearch, parentId = googleFolderId) {
    setGoogleFilesLoading(true)
    try {
      const response = await api.get("/settings/google-drive/files", { params: { q: query.trim() || undefined, parentId } })
      const rows = response.data?.data?.files || []
      setGoogleFiles(rows.map((row: Record<string, unknown>) => ({
        id: String(row.id || ""),
        folderId: "google-drive",
        title: String(row.title || row.originalName || row.id),
        originalName: String(row.originalName || row.title || row.id),
        publicUrl: String(row.publicUrl || ""),
        mimeType: row.mimeType ? String(row.mimeType) : undefined,
        sizeBytes: row.sizeBytes ? Number(row.sizeBytes) : 0,
        modifiedTime: row.modifiedTime ? String(row.modifiedTime) : undefined,
        thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : undefined,
      })))
    } finally {
      setGoogleFilesLoading(false)
    }
  }

  async function loadGoogleFolders() {
    setGoogleFoldersLoading(true)
    try {
      const response = await api.get("/settings/google-drive/folders")
      const rows = response.data?.data?.folders || []
      const rawFolders = rows.map((row: Record<string, unknown>) => ({
        id: String(row.id || ""),
        name: String(row.name || row.id || ""),
        parentId: row.parentId ? String(row.parentId) : null,
      })) as GoogleFolderRecord[]
      const folderIds = new Set(rawFolders.map((folder) => folder.id))
      setGoogleFolders(rawFolders.map((folder) => ({
        ...folder,
        parentId: folder.parentId && folderIds.has(folder.parentId) ? folder.parentId : null,
      })))
    } finally {
      setGoogleFoldersLoading(false)
    }
  }

  function changeFileSource(source: "system" | "google") {
    setFileSource(source)
    setFileSearch("")
    if (source === "google" && googleDrive?.connected) {
      setGoogleFolderId("root")
      setGoogleFolderPath([])
      setGoogleExpandedKeys(["root"])
      void Promise.all([loadGoogleFiles("", "root"), loadGoogleFolders()])
    }
  }

  function openGoogleFolder(folder: FileRecord) {
    selectGoogleFolder(folder.id)
  }

  function selectGoogleFolder(folderId: string) {
    const byId = new Map(googleFolders.map((folder) => [folder.id, folder]))
    const path: Array<{ id: string; name: string }> = []
    const visited = new Set<string>()
    let current = byId.get(folderId)
    while (current && !visited.has(current.id)) {
      path.unshift({ id: current.id, name: current.name })
      visited.add(current.id)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    setGoogleFolderPath(path)
    setGoogleExpandedKeys((keys) => Array.from(new Set([...keys, "root", ...path.map((folder) => folder.id)])))
    setFileSearch("")
    setGoogleFolderId(folderId)
    void loadGoogleFiles("", folderId)
  }

  function goToGoogleFolder(index: number) {
    selectGoogleFolder(index < 0 ? "root" : googleFolderPath[index]?.id || "root")
  }

  async function saveGoogleFolder() {
    const name = googleFolderName.trim()
    if (!name) {
      message.warning("Nhập tên thư mục")
      return
    }
    setGoogleDriveLoading(true)
    try {
      if (googleRenameTarget) {
        await api.patch(`/settings/google-drive/files/${googleRenameTarget.id}`, { name })
        message.success("Đã đổi tên trên Google Drive")
      } else {
        await api.post("/settings/google-drive/folders", { name, parentId: googleFolderId })
        message.success("Đã tạo thư mục trên Google Drive")
      }
      setGoogleFolderModalOpen(false)
      setGoogleFolderName("")
      setGoogleRenameTarget(null)
      await loadGoogleFiles()
      await loadGoogleFolders()
    } finally {
      setGoogleDriveLoading(false)
    }
  }

  async function deleteGoogleDriveItem(file: FileRecord) {
    await api.delete(`/settings/google-drive/files/${file.id}`)
    message.success("Đã xóa trên Google Drive")
    await loadGoogleFiles()
    if (file.mimeType === "application/vnd.google-apps.folder") await loadGoogleFolders()
  }

  const googleUploadProps: UploadProps = {
    beforeUpload: () => false,
    fileList: googleUploadFileList,
    maxCount: 1,
    onChange: ({ fileList: nextFileList }) => setGoogleUploadFileList(nextFileList.slice(-1)),
  }

  async function uploadGoogleDriveFile() {
    const file = googleUploadFileList[0]?.originFileObj
    if (!file) {
      message.warning("Chọn file trước khi upload")
      return
    }
    setGoogleUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("parentId", googleFolderId)
      await api.post("/settings/google-drive/files/upload", formData)
      message.success("Đã upload file lên Google Drive")
      setGoogleUploadOpen(false)
      setGoogleUploadFileList([])
      await loadGoogleFiles()
    } finally {
      setGoogleUploading(false)
    }
  }

  function openCreateFolder(parentId?: string) {
    setEditingFolder(null)
    folderForm.resetFields()
    folderForm.setFieldsValue({
      parentId: parentId ?? selectedFolderId,
      isActive: true,
    })
    setFolderModalOpen(true)
  }

  function openEditFolder(folder: FolderRecord) {
    setEditingFolder(folder)
    folderForm.setFieldsValue({
      name: folder.name,
      parentId: folder.parentId || undefined,
      description: folder.description,
      isActive: folder.isActive ?? true,
    })
    setFolderModalOpen(true)
  }

  async function saveFolder(values: Record<string, unknown>) {
    setSubmitting(true)
    try {
      const payload = {
        name: String(values.name || "").trim(),
        parentId: values.parentId ? String(values.parentId) : undefined,
        description: values.description ? String(values.description) : undefined,
        isActive: values.isActive !== false,
      }
      if (editingFolder) {
        await api.patch(`/records/file-folders/${editingFolder.id}`, payload)
        message.success("Đã cập nhật thư mục")
      } else {
        await api.post("/records/file-folders", payload)
        message.success("Đã tạo thư mục")
      }
      setFolderModalOpen(false)
      folderForm.resetFields()
      await loadData()
    } finally {
      setSubmitting(false)
    }
  }

  async function removeFolder(folder: FolderRecord) {
    const hasChildren = folders.some((item) => item.parentId === folder.id)
    const hasFiles = files.some((item) => item.folderId === folder.id)
    if (hasChildren || hasFiles) {
      message.error("Thư mục còn chứa thư mục con hoặc tệp, chưa thể xóa")
      return
    }
    await api.delete(`/records/file-folders/${folder.id}`)
    message.success("Đã xóa thư mục")
    if (selectedFolderId === folder.id) {
      setSelectedFolderId(undefined)
    }
    await loadData()
  }

  async function removeFile(file: FileRecord) {
    await api.delete(`/records/files/${file.id}`)
    message.success("Đã xóa file")
    await loadData()
  }

  async function downloadFile(file: FileRecord) {
    if (fileSource === "google") {
      const response = await api.get(`/settings/google-drive/files/${file.id}/download`, { responseType: "blob" })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement("a")
      link.href = url
      link.download = file.originalName || file.title
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return
    }
    const link = document.createElement("a")
    link.href = resolveFileUrl(file.publicUrl)
    link.download = file.originalName || file.title
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const columns: ColumnsType<FileRecord> = [
    {
      title: "File",
      key: "file",
      width: 320,
      render: (_, row) => (
        <div className="document-file-cell">
          {fileSource === "system" && isImageFile(row) ? (
            <Image
              alt={row.title}
              className="document-file-thumb"
              preview={{ mask: "Xem" }}
              src={row.thumbnailUrl || resolveFileUrl(row.publicUrl)}
            />
          ) : (
            <div className="document-file-icon">{renderFileIcon(row)}</div>
          )}
          <div className="document-file-copy">
            {fileSource === "google" && row.mimeType === "application/vnd.google-apps.folder" ? (
              <Button type="link" style={{ height: "auto", padding: 0 }} onClick={() => openGoogleFolder(row)}>{row.title}</Button>
            ) : <strong>{row.title}</strong>}
            {row.originalName !== row.title && <span>{row.originalName}</span>}
          </div>
        </div>
      ),
    },
    {
      title: "Loại",
      key: "type",
      width: 160,
      render: (_, row) => (
        <Tag>{row.extension?.toUpperCase() || row.mimeType || "FILE"}</Tag>
      ),
    },
    {
      title: "Dung lượng",
      dataIndex: "sizeBytes",
      key: "sizeBytes",
      width: 140,
      render: (value) => formatBytes(Number(value || 0)),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (value) => value || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      render: (_, row) => (
        <Space>
          {row.mimeType !== "application/vnd.google-apps.folder" && (
            <Button
              href={resolveFileUrl(row.publicUrl)}
              icon={<EyeOutlined />}
              rel="noreferrer"
              target="_blank"
            />
          )}
          {row.mimeType !== "application/vnd.google-apps.folder" && (
            <Button icon={<DownloadOutlined />} onClick={() => void downloadFile(row)} />
          )}
          {fileSource === "system" && hasActionAccess("files", "delete") && (
            <Popconfirm title="Lưu trữ file này?" onConfirm={() => void removeFile(row)}>
              <Button icon={<InboxOutlined />} style={{ color: "#1677ff" }} />
            </Popconfirm>
          )}
          {fileSource === "google" && canConfigureGoogleDrive && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setGoogleRenameTarget(row)
                  setGoogleFolderName(row.title)
                  setGoogleFolderModalOpen(true)
                }}
              />
              <Popconfirm title={`Xóa ${row.mimeType === "application/vnd.google-apps.folder" ? "thư mục" : "tệp"} này trên Google Drive?`} onConfirm={() => void deleteGoogleDriveItem(row)}>
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Thư mục tài liệu</Typography.Title>
        </div>
        <Space wrap>
          <Segmented
            options={[
              { label: "File hệ thống", value: "system" },
              { disabled: !googleDrive?.connected, label: "Google Drive", value: "google" },
            ]}
            value={fileSource}
            onChange={(value) => changeFileSource(value as "system" | "google")}
          />
          {canConfigureGoogleDrive && (
            googleDrive?.connected ? (
              <Popconfirm
                title="Ngắt Google Drive dùng chung?"
                description="Dữ liệu file đã lưu trong hệ thống không bị xóa."
                onConfirm={() => void disconnectGoogleDrive()}
              >
                <Button danger ghost icon={<DisconnectOutlined />} loading={googleDriveLoading}>
                  Drive: {googleDrive.accountEmail || "Đã kết nối"}
                </Button>
              </Popconfirm>
            ) : (
              <Button
                icon={<GoogleOutlined />}
                loading={googleDriveLoading}
                type="default"
                onClick={() => void connectGoogleDrive()}
              >
                Kết nối Google Drive
              </Button>
            )
          )}
          {fileSource === "system" && hasActionAccess("file-folders", "create") && (
            <Button icon={<PlusOutlined />} onClick={() => openCreateFolder()}>
              Tạo thư mục gốc
            </Button>
          )}
          {fileSource === "system" && hasActionAccess("files", "create") && (
            <Button
              className="primary-glow"
              disabled={!selectedFolderId}
              icon={<UploadOutlined />}
              type="primary"
              onClick={() => setUploadOpen(true)}
            >
              Tải tệp lên
            </Button>
          )}
        </Space>
      </div>

      <div className="document-workspace">
        <Card className="glass-card document-tree-card" loading={fileSource === "system" ? loading : googleFoldersLoading}>
          <div className="document-tree-header">
            <div>
              <Typography.Title level={4}>Cây thư mục</Typography.Title>
              <Typography.Text type="secondary">
                {fileSource === "google" ? "Chọn một thư mục Google Drive để xem tệp bên phải" : "Chọn một thư mục để xem tệp bên phải"}
              </Typography.Text>
            </div>
            {fileSource === "system" && selectedFolderId && hasActionAccess("file-folders", "create") && (
              <Button icon={<FolderAddOutlined />} onClick={() => openCreateFolder(selectedFolderId)}>
                Thư mục con
              </Button>
            )}
          </div>
          <Input.Search
            allowClear
            placeholder={fileSource === "google" ? "Tìm thư mục Google Drive" : "Tìm thư mục"}
            value={folderSearch}
            onChange={(event) => setFolderSearch(event.target.value)}
          />
          {fileSource === "google" ? (
            <Tree
              blockNode
              className="document-tree"
              expandedKeys={googleExpandedKeys}
              selectedKeys={[googleFolderId]}
              treeData={googleFolderTree}
              onExpand={(keys) => setGoogleExpandedKeys(keys as string[])}
              onSelect={(keys) => selectGoogleFolder(String(keys[0] || "root"))}
            />
          ) : visibleTree.length === 0 ? (
            <Empty className="document-empty" description="Chưa có thư mục phù hợp" />
          ) : (
            <Tree
              blockNode
              className="document-tree"
              expandedKeys={expandedKeys}
              selectedKeys={selectedFolderId ? [selectedFolderId] : []}
              treeData={visibleTree}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={(keys) => setSelectedFolderId(String(keys[0] || ""))}
            />
          )}
        </Card>

        <Card className="glass-card document-files-card" loading={fileSource === "system" ? loading : googleFilesLoading}>
          {fileSource === "google" ? (
            <Space className="document-files-content" direction="vertical" size={10} style={{ width: "100%" }}>
              <div className="document-files-header">
                <div>
                  <Typography.Title level={3}>Google Drive công ty</Typography.Title>
                  <Typography.Text type="secondary">{googleDrive?.accountEmail || "Drive dùng chung của công ty"}</Typography.Text>
                  <div>
                    <Button disabled={googleFolderPath.length === 0} size="small" type="link" onClick={() => goToGoogleFolder(googleFolderPath.length - 2)}>Thư mục gốc</Button>
                    {googleFolderPath.map((folder, index) => (
                      <span key={folder.id}>
                        <Typography.Text type="secondary"> / </Typography.Text>
                        <Button size="small" type="link" onClick={() => goToGoogleFolder(index)}>{folder.name}</Button>
                      </span>
                    ))}
                  </div>
                </div>
                {canConfigureGoogleDrive && (
                  <Space wrap>
                    <Button icon={<FolderAddOutlined />} onClick={() => { setGoogleRenameTarget(null); setGoogleFolderName(""); setGoogleFolderModalOpen(true) }}>Tạo thư mục</Button>
                    <Button className="primary-glow" icon={<UploadOutlined />} type="primary" onClick={() => setGoogleUploadOpen(true)}>Tải lên Drive</Button>
                  </Space>
                )}
              </div>
              <div className="document-files-toolbar">
                <Input.Search
                  allowClear
                  placeholder="Tìm file trên Google Drive"
                  value={fileSearch}
                  onChange={(event) => setFileSearch(event.target.value)}
                  onSearch={(value) => void loadGoogleFiles(value)}
                />
              </div>
              <Table
                className="document-files-table"
                columns={columns}
                dataSource={googleFiles}
                locale={{ emptyText: "Không tìm thấy file trên Google Drive" }}
                pagination={{ pageSize: 12, showSizeChanger: true }}
                rowKey="id"
                scroll={{ x: "max-content", y: "calc(100dvh - 380px)" }}
                size="small"
              />
            </Space>
          ) : selectedFolder ? (
            <Space className="document-files-content" direction="vertical" size={10} style={{ width: "100%" }}>
              <div className="document-files-header">
                <div>
                  <Typography.Title level={3}>{selectedFolder.name}</Typography.Title>
                  <Typography.Text type="secondary">
                    {folderPathMap[selectedFolder.id]}
                  </Typography.Text>
                  {selectedFolder.description && (
                    <Typography.Paragraph className="document-folder-description" type="secondary">
                      {selectedFolder.description}
                    </Typography.Paragraph>
                  )}
                </div>
                <Space wrap>
                  {hasActionAccess("file-folders", "update") && (
                    <Button icon={<EditOutlined />} onClick={() => openEditFolder(selectedFolder)}>
                      Sửa folder
                    </Button>
                  )}
                  {hasActionAccess("file-folders", "delete") && (
                    <Popconfirm title="Lưu trữ thư mục này?" onConfirm={() => void removeFolder(selectedFolder)}>
                      <Button icon={<InboxOutlined />} style={{ color: "#1677ff" }}>
                        Lưu trữ folder
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>

              <div className="document-folder-summary">
                <Tag icon={<FolderOpenOutlined />}>{childFolders.length} thư mục con</Tag>
                <Tag>{directFiles.length} file trực tiếp</Tag>
              </div>

              {childFolders.length > 0 && (
                <div className="document-subfolders">
                  {childFolders.map((folder) => (
                    <button
                      key={folder.id}
                      className={`document-subfolder-chip${folder.id === selectedFolderId ? " active" : ""}`}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                    >
                      <FolderOpenOutlined />
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="document-files-toolbar">
                <Input.Search
                  allowClear
                  placeholder="Tìm tệp trong thư mục"
                  value={fileSearch}
                  onChange={(event) => setFileSearch(event.target.value)}
                />
              </div>

              <Table
                className="document-files-table"
                columns={columns}
                dataSource={filteredFiles}
                locale={{ emptyText: "Thư mục này chưa có tệp" }}
                pagination={{ pageSize: 12, showSizeChanger: true }}
                rowKey="id"
                scroll={{ x: "max-content", y: "calc(100dvh - 420px)" }}
                size="small"
              />
            </Space>
          ) : (
            <Empty className="document-empty" description="Chưa có thư mục nào để hiển thị" />
          )}
        </Card>
      </div>

      <Modal
        destroyOnHidden
        okText={editingFolder ? "Lưu thư mục" : "Tạo thư mục"}
        okButtonProps={{ className: "primary-glow", loading: submitting, type: "primary" }}
        open={folderModalOpen}
        title={editingFolder ? "Cập nhật thư mục" : "Tạo thư mục mới"}
        onCancel={() => setFolderModalOpen(false)}
        onOk={() => void folderForm.submit()}
      >
        <Form form={folderForm} layout="vertical" onFinish={(values) => void saveFolder(values)}>
          <Form.Item label="Tên thư mục" name="name" rules={[{ required: true, message: "Nhập tên thư mục" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Thư mục cha" name="parentId">
            <TreeSelect
              allowClear
              placeholder="Không chọn nếu là thư mục gốc"
              treeData={folderTree}
              treeDefaultExpandAll
              treeNodeFilterProp="title"
            />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        confirmLoading={googleDriveLoading}
        okText={googleRenameTarget ? "Lưu tên" : "Tạo thư mục"}
        okButtonProps={{ className: "primary-glow", type: "primary" }}
        open={googleFolderModalOpen}
        title={googleRenameTarget ? "Đổi tên trên Google Drive" : "Tạo thư mục trên Google Drive"}
        onCancel={() => { setGoogleFolderModalOpen(false); setGoogleFolderName(""); setGoogleRenameTarget(null) }}
        onOk={() => void saveGoogleFolder()}
      >
        <Input autoFocus placeholder="Tên thư mục" value={googleFolderName} onChange={(event) => setGoogleFolderName(event.target.value)} onPressEnter={() => void saveGoogleFolder()} />
      </Modal>

      <Modal
        className="google-drive-upload-modal"
        confirmLoading={googleUploading}
        okText="Upload"
        okButtonProps={{ className: "primary-glow", type: "primary" }}
        open={googleUploadOpen}
        title="Tải tệp lên Google Drive"
        onCancel={() => { setGoogleUploadOpen(false); setGoogleUploadFileList([]) }}
        onOk={() => void uploadGoogleDriveFile()}
        width={520}
      >
        <Upload.Dragger {...googleUploadProps} className="google-drive-upload-dragger">
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">Chọn file để upload vào thư mục hiện tại</p>
        </Upload.Dragger>
      </Modal>

      <Modal
        destroyOnHidden
        footer={null}
        open={uploadOpen}
        title={`Tải tệp lên ${selectedFolder?.name || "thư mục"}`}
        onCancel={() => setUploadOpen(false)}
        width={720}
      >
        <FileUploadPanel
          defaultFolderId={selectedFolderId}
          onCancel={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false)
            void loadData()
          }}
        />
      </Modal>
    </>
  )
}

function isImageFile(file: { mimeType?: string; extension?: string }) {
  const mimeType = String(file.mimeType || "").toLowerCase()
  if (mimeType.startsWith("image/")) return true
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(String(file.extension || "").toLowerCase())
}

function renderFileIcon(file: { mimeType?: string; extension?: string }) {
  const mimeType = String(file.mimeType || "").toLowerCase()
  const extension = String(file.extension || "").toLowerCase()
  if (mimeType === "application/vnd.google-apps.folder") return <FolderOpenOutlined />
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)) {
    return <FileImageOutlined />
  }
  if (mimeType.includes("pdf") || extension === "pdf") return <FilePdfOutlined />
  if (["doc", "docx"].includes(extension) || mimeType.includes("wordprocessingml") || mimeType.includes("msword")) return <FileWordOutlined />
  if (["xls", "xlsx", "csv"].includes(extension) || mimeType.includes("spreadsheetml") || mimeType.includes("spreadsheet")) return <FileExcelOutlined />
  if (["ppt", "pptx"].includes(extension) || mimeType.includes("presentationml") || mimeType.includes("presentation")) return <FilePptOutlined />
  if (mimeType.startsWith("text/") || ["txt", "rtf", "md"].includes(extension)) {
    return <FileTextOutlined />
  }
  return <FileOutlined />
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-"
  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function filterTreeByKeyword(nodes: FolderTreeNode[], keyword: string): FolderTreeNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return nodes
  return nodes
    .map((node) => {
      const children = filterTreeByKeyword(node.children || [], keyword)
      const matched = String(node.title).toLowerCase().includes(normalizedKeyword)
      return matched || children.length > 0 ? { ...node, children } : null
    })
    .filter(Boolean) as FolderTreeNode[]
}
