import { FolderAddOutlined, InboxOutlined, UploadOutlined } from "@ant-design/icons"
import { Button, Form, Input, Space, TreeSelect, Typography, Upload, message } from "antd"
import type { UploadFile, UploadProps } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { buildFolderTree, FolderTreeNode, normalizeFileFolderRows } from "../utils/fileFolders"

interface UploadedFileRecord {
  id: string
  title?: string
  originalName: string
  folderId: string
  publicUrl: string
}

interface FileUploadPanelProps {
  defaultFolderId?: string
  accept?: string
  multiple?: boolean
  onCancel?: () => void
  onSuccess?: (files: UploadedFileRecord[]) => void
}

export function FileUploadPanel({
  defaultFolderId,
  accept = "*",
  multiple = true,
  onCancel,
  onSuccess,
}: FileUploadPanelProps) {
  const [form] = Form.useForm()
  const [createFolderForm] = Form.useForm()
  const [folders, setFolders] = useState<FolderTreeNode[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void loadFolders()
  }, [])

  useEffect(() => {
    form.setFieldsValue({ folderId: defaultFolderId })
    createFolderForm.setFieldsValue({ parentId: defaultFolderId })
  }, [createFolderForm, defaultFolderId, form])

  async function loadFolders() {
    const response = await api.get("/records/file-folders", { params: { pageSize: 200 } })
    setFolders(buildFolderTree(normalizeFileFolderRows(response.data.data || [])))
  }

  const uploadProps: UploadProps = {
    accept,
    multiple,
    beforeUpload: (file) => {
      setSelectedFiles((current) => [...current, file as File])
      setFileList((current) => [
        ...current,
        {
          uid: file.uid,
          name: file.name,
          status: "done",
        },
      ])
      return false
    },
    fileList,
    onRemove: (file) => {
      setSelectedFiles((current) => current.filter((item) => `${item.name}-${item.size}-${item.lastModified}` !== `${file.name}-${file.size || 0}-${file.lastModified || 0}`))
      setFileList((current) => current.filter((item) => item.uid !== file.uid))
    },
  }

  async function submit(values: { folderId: string; title?: string; note?: string }) {
    if (selectedFiles.length === 0) {
      message.warning("Chọn file trước khi upload")
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("folderId", values.folderId)
      if (values.title && selectedFiles.length === 1) formData.append("title", values.title)
      if (values.note) formData.append("note", values.note)
      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })
      const response = await api.post("/records/files/upload", formData)
      const uploaded = Array.isArray(response.data.data) ? response.data.data : [response.data.data]
      message.success(`Đã upload ${uploaded.length} file`)
      setSelectedFiles([])
      setFileList([])
      form.resetFields()
      onSuccess?.(uploaded)
    } finally {
      setSubmitting(false)
    }
  }

  async function createFolder(values: { code: string; name: string; parentId?: string; description?: string }) {
    setCreatingFolder(true)
    try {
      const response = await api.post("/records/file-folders", {
        code: values.code.trim(),
        name: values.name.trim(),
        parentId: values.parentId || null,
        description: values.description?.trim() || undefined,
        isActive: true,
      })
      const createdFolder = response.data.data as { id: string }
      await loadFolders()
      form.setFieldValue("folderId", createdFolder.id)
      createFolderForm.resetFields()
      createFolderForm.setFieldValue("parentId", createdFolder.id)
      setShowCreateFolder(false)
      message.success("Đã tạo folder mới")
    } finally {
      setCreatingFolder(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
      <Typography.Paragraph type="secondary">
        File phải được upload vào folder trước rồi mới được chọn vào record.
      </Typography.Paragraph>
      {multiple && (
        <Typography.Paragraph type="secondary">
          Có thể kéo nhiều file cùng lúc. Tất cả file sẽ được lưu vào cùng folder đang chọn.
        </Typography.Paragraph>
      )}
      <div className="upload-folder-block">
        <div className="upload-folder-block-head">
          <Typography.Text strong>Folder upload</Typography.Text>
          <Button
            icon={<FolderAddOutlined />}
            type={showCreateFolder ? "default" : "dashed"}
            onClick={() => {
              const nextOpen = !showCreateFolder
              setShowCreateFolder(nextOpen)
              if (nextOpen) {
                createFolderForm.setFieldsValue({ parentId: form.getFieldValue("folderId") || defaultFolderId })
              }
            }}
          >
            {showCreateFolder ? "Ẩn tạo folder" : "Tạo folder mới"}
          </Button>
        </div>
        <Form.Item name="folderId" rules={[{ required: true, message: "Chọn folder upload" }]}>
          <TreeSelect
            allowClear
            placeholder="Chọn folder"
            showSearch
            treeData={folders}
            treeDefaultExpandAll
            treeNodeFilterProp="title"
          />
        </Form.Item>
        {showCreateFolder ? (
          <div className="upload-folder-create-panel">
            <Form
              component={false}
              form={createFolderForm}
              layout="vertical"
            >
              <div className="upload-folder-create-grid">
                <Form.Item
                  label="Mã folder"
                  name="code"
                  rules={[{ required: true, message: "Nhập mã folder" }]}
                >
                  <Input placeholder="VD: HSKH-2026" />
                </Form.Item>
                <Form.Item
                  label="Tên folder"
                  name="name"
                  rules={[{ required: true, message: "Nhập tên folder" }]}
                >
                  <Input placeholder="Tên folder mới" />
                </Form.Item>
              </div>
              <Form.Item label="Folder cha" name="parentId">
                <TreeSelect
                  allowClear
                  placeholder="Tạo ở folder gốc"
                  showSearch
                  treeData={folders}
                  treeDefaultExpandAll
                  treeNodeFilterProp="title"
                />
              </Form.Item>
              <Form.Item label="Mô tả" name="description">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
              </Form.Item>
              <Space>
                <Button
                  loading={creatingFolder}
                  type="primary"
                  onClick={() => {
                    void createFolderForm
                      .validateFields()
                      .then((values) => createFolder(values))
                  }}
                >
                  Tạo folder
                </Button>
                <Button
                  onClick={() => {
                    createFolderForm.resetFields()
                    createFolderForm.setFieldValue("parentId", form.getFieldValue("folderId") || defaultFolderId)
                    setShowCreateFolder(false)
                  }}
                >
                  Hủy
                </Button>
              </Space>
            </Form>
          </div>
        ) : null}
      </div>
      <Form.Item name="title" label="Tên hiển thị">
        <Input disabled={selectedFiles.length > 1} placeholder="Mặc định lấy theo tên file" />
      </Form.Item>
      <Form.Item name="note" label="Ghi chú">
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
      </Form.Item>
      <Form.Item label="File upload" required>
        <Upload.Dragger {...uploadProps} style={{ background: "transparent" }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Kéo file vào đây hoặc bấm để chọn {multiple ? "nhiều file" : "file"}</p>
          <p className="ant-upload-hint">Hệ thống sẽ lưu file vào folder bạn đã chọn.</p>
        </Upload.Dragger>
      </Form.Item>
      <Space>
        <Button className="primary-glow" htmlType="submit" icon={<UploadOutlined />} loading={submitting} type="primary">
          {multiple ? "Upload file" : "Upload và chọn"}
        </Button>
        <Button onClick={onCancel}>Hủy</Button>
      </Space>
    </Form>
  )
}
