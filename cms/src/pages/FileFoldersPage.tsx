import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
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
  Space,
  Table,
  Tag,
  Tree,
  TreeSelect,
  Typography,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { hasActionAccess } from "../access"
import { api } from "../api"
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
  const [folderForm] = Form.useForm()

  useEffect(() => {
    void loadData()
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
        message.success("Đã cập nhật folder")
      } else {
        await api.post("/records/file-folders", payload)
        message.success("Đã tạo folder")
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
      message.error("Folder còn chứa thư mục con hoặc file, chưa thể xóa")
      return
    }
    await api.delete(`/records/file-folders/${folder.id}`)
    message.success("Đã xóa folder")
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

  const columns: ColumnsType<FileRecord> = [
    {
      title: "File",
      key: "file",
      width: 320,
      render: (_, row) => (
        <div className="document-file-cell">
          {isImageFile(row) ? (
            <Image
              alt={row.title}
              className="document-file-thumb"
              preview={{ mask: "Xem" }}
              src={row.publicUrl}
            />
          ) : (
            <div className="document-file-icon">{renderFileIcon(row)}</div>
          )}
          <div className="document-file-copy">
            <strong>{row.title}</strong>
            <span>{row.originalName}</span>
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
      width: 140,
      render: (_, row) => (
        <Space>
          <Button
            href={row.publicUrl}
            icon={<EyeOutlined />}
            rel="noreferrer"
            target="_blank"
          />
          {hasActionAccess("files", "delete") && (
            <Popconfirm title="Xóa file này?" onConfirm={() => void removeFile(row)}>
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Tài liệu & file</Typography.Text>
          <Typography.Title level={2}>Folder tài liệu</Typography.Title>
        </div>
        <Space wrap>
          {hasActionAccess("file-folders", "create") && (
            <Button icon={<PlusOutlined />} onClick={() => openCreateFolder()}>
              Tạo folder gốc
            </Button>
          )}
          {hasActionAccess("files", "create") && (
            <Button
              className="primary-glow"
              disabled={!selectedFolderId}
              icon={<UploadOutlined />}
              type="primary"
              onClick={() => setUploadOpen(true)}
            >
              Upload file
            </Button>
          )}
        </Space>
      </div>

      <div className="document-workspace">
        <Card className="glass-card document-tree-card" loading={loading}>
          <div className="document-tree-header">
            <div>
              <Typography.Title level={4}>Cây thư mục</Typography.Title>
              <Typography.Text type="secondary">
                Chọn một folder để xem file bên phải
              </Typography.Text>
            </div>
            {selectedFolderId && hasActionAccess("file-folders", "create") && (
              <Button icon={<FolderAddOutlined />} onClick={() => openCreateFolder(selectedFolderId)}>
                Folder con
              </Button>
            )}
          </div>
          <Input.Search
            allowClear
            placeholder="Tìm folder"
            value={folderSearch}
            onChange={(event) => setFolderSearch(event.target.value)}
          />
          {visibleTree.length === 0 ? (
            <Empty className="document-empty" description="Chưa có folder phù hợp" />
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

        <Card className="glass-card document-files-card" loading={loading}>
          {selectedFolder ? (
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div className="document-files-header">
                <div>
                  <Typography.Text className="eyebrow">Folder đang chọn</Typography.Text>
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
                    <Popconfirm title="Xóa folder này?" onConfirm={() => void removeFolder(selectedFolder)}>
                      <Button danger icon={<DeleteOutlined />}>
                        Xóa folder
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>

              <div className="document-folder-summary">
                <Tag icon={<FolderOpenOutlined />}>{childFolders.length} folder con</Tag>
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
                  placeholder="Tìm file trong folder"
                  value={fileSearch}
                  onChange={(event) => setFileSearch(event.target.value)}
                />
              </div>

              <Table
                className="document-files-table"
                columns={columns}
                dataSource={filteredFiles}
                locale={{ emptyText: "Folder này chưa có file" }}
                pagination={{ pageSize: 12, showSizeChanger: true }}
                rowKey="id"
                scroll={{ x: "max-content" }}
                size="small"
              />
            </Space>
          ) : (
            <Empty className="document-empty" description="Chưa có folder nào để hiển thị" />
          )}
        </Card>
      </div>

      <Modal
        destroyOnHidden
        okText={editingFolder ? "Lưu folder" : "Tạo folder"}
        okButtonProps={{ className: "primary-glow", loading: submitting, type: "primary" }}
        open={folderModalOpen}
        title={editingFolder ? "Cập nhật folder" : "Tạo folder mới"}
        onCancel={() => setFolderModalOpen(false)}
        onOk={() => void folderForm.submit()}
      >
        <Form form={folderForm} layout="vertical" onFinish={(values) => void saveFolder(values)}>
          <Form.Item label="Tên folder" name="name" rules={[{ required: true, message: "Nhập tên folder" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Folder cha" name="parentId">
            <TreeSelect
              allowClear
              placeholder="Không chọn nếu là folder gốc"
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
        destroyOnHidden
        footer={null}
        open={uploadOpen}
        title={`Upload file vào ${selectedFolder?.name || "folder"}`}
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
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)) {
    return <FileImageOutlined />
  }
  if (mimeType.includes("pdf") || extension === "pdf") return <FilePdfOutlined />
  if (mimeType.startsWith("text/") || ["doc", "docx", "txt", "rtf", "md", "xls", "xlsx", "csv"].includes(extension)) {
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
