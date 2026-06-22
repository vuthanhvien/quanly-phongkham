import { useCreate, useOne, useUpdate } from "@refinedev/core"
import {
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons"
import {
  Button,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Col,
  Modal,
  Row,
  Select,
  Space,
  Tree,
  TreeSelect,
  Typography,
  message,
} from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { FileUploadPanel } from "./FileUploadPanel"
import { CustomField, entityLabels, FieldSpec, relationFields } from "../models"
import { loadRelationOptions, LookupMap } from "../relations"
import { getApiErrorMessage } from "../utils/apiError"
import { buildFolderPathMap, buildFolderTree, FolderTreeNode, normalizeFileFolderRows } from "../utils/fileFolders"
import {
  getFieldCatalog,
  getStoredUserRole,
  getVisibleFieldConfigs,
  ViewSettingRecord,
} from "../view-settings"

interface RecordFormContentProps {
  resource: string
  id?: string
  compact?: boolean
  initialValues?: Record<string, unknown>
  onCancel?: () => void
  onSuccess?: () => void
}

export function RecordFormContent({
  resource,
  id,
  compact,
  initialValues,
  onCancel,
  onSuccess,
}: RecordFormContentProps) {
  const editing = Boolean(id)
  const [form] = Form.useForm()
  const [fields, setFields] = useState<FieldSpec[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const { mutate: create } = useCreate()
  const { mutate: update } = useUpdate()
  const recordQuery = useOne({
    resource,
    id: id || "",
    queryOptions: { enabled: editing },
  }) as any

  useEffect(() => {
    Promise.all([
      api.get("/settings/custom-fields", { params: { entityType: resource } }),
      api.get("/settings/views", { params: { entityType: resource } }),
    ])
      .then(([fieldResponse, viewResponse]) => {
        const customFields = fieldResponse.data.data.filter(
          (field: CustomField) => field.isActive,
        )
        const nextFields = getVisibleFieldConfigs(
          getFieldCatalog(resource, customFields),
          viewResponse.data.data as ViewSettingRecord[],
          "FORM",
          getStoredUserRole(),
        )
        setFields(nextFields)
        return loadRelationOptions(nextFields)
      })
      .then(setLookups)
  }, [resource])

  useEffect(() => {
    const data =
      recordQuery.result?.data ||
      recordQuery.query?.data?.data ||
      recordQuery.data?.data?.data
    if (data) {
      form.setFieldsValue({ ...data, ...(data.customFields || {}) })
      return
    }
    if (!editing && fields.length > 0) {
      form.setFieldsValue(
        {
          ...Object.fromEntries(
            fields
              .filter((field) => field.defaultValue !== undefined)
              .map((field) => [field.key, field.defaultValue]),
          ),
          ...(initialValues || {}),
        },
      )
    }
  }, [editing, fields, form, initialValues, recordQuery.result, recordQuery.query?.data, recordQuery.data?.data?.data])

  function submit(values: Record<string, unknown>) {
    const mergedValues = { ...(initialValues || {}), ...values }
    const baseKeys = new Set(
      getFieldCatalog(resource, []).map((field) => field.key),
    )
    const payload: Record<string, unknown> = { customFields: {} }
    Object.entries(mergedValues).forEach(([key, value]) => {
      if (baseKeys.has(key)) payload[key] = value
      else (payload.customFields as Record<string, unknown>)[key] = value
    })
    const done = () => {
      message.success("Đã lưu dữ liệu")
      onSuccess?.()
    }
    if (editing)
      update(
        { resource, id: id!, values: payload },
        {
          onSuccess: done,
          onError: (error) => {
            message.error(getApiErrorMessage(error, "Không thể lưu dữ liệu"))
          },
        },
      )
    else
      create(
        { resource, values: payload },
        {
          onSuccess: done,
          onError: (error) => {
            message.error(getApiErrorMessage(error, "Không thể lưu dữ liệu"))
          },
        },
      )
  }

  return (
    <>
      {!compact && (
        <>
          <Typography.Text className="eyebrow">Dynamic form</Typography.Text>
          <Typography.Title level={2}>
            {editing ? "Cập nhật" : "Thêm"} {entityLabels[resource] || resource}
          </Typography.Title>
        </>
      )}
      <Form
        className="record-form"
        form={form}
        layout="vertical"
        onFinish={submit}
      >
        <Row gutter={[16, 0]}>
          {fields.map((field) => (
            <Col key={field.key} span={widthToSpan(field.width)} xs={24}>
              <Form.Item
                label={
                  field.description ? (
                    <Space direction="vertical" size={0}>
                      <span>{field.label}</span>
                      <Typography.Text type="secondary">
                        {field.description}
                      </Typography.Text>
                    </Space>
                  ) : (
                    field.label
                  )
                }
                name={field.key}
                rules={[
                  {
                    required: Boolean(field.required && !field.disabled),
                    message: `Nhập ${field.label}`,
                  },
                ]}
              >
                <FieldInput field={field} lookups={lookups} />
              </Form.Item>
            </Col>
          ))}
        </Row>
        <Space>
          <Button className="primary-glow" htmlType="submit" type="primary">
            Lưu
          </Button>
          <Button onClick={onCancel}>Hủy</Button>
        </Space>
      </Form>
    </>
  )
}

function widthToSpan(width?: FieldSpec["width"]) {
  switch (width) {
    case "25":
      return 6
    case "33":
      return 8
    case "50":
      return 12
    case "66":
      return 16
    case "100":
    default:
      return 24
  }
}

function FieldInput({
  field,
  lookups,
  value,
  onChange,
}: {
  field: FieldSpec
  lookups: LookupMap
  value?: unknown
  onChange?: (value: unknown) => void
}) {
  if (field.type === "number")
    return (
      <InputNumber
        disabled={field.disabled}
        placeholder={field.placeholder}
        style={{ width: "100%" }}
        value={value as number | undefined}
        onChange={onChange}
      />
    )
  if (field.type === "select")
    return (
      <Select
        disabled={field.disabled}
        options={(field.options || []).map((opt) => ({
          label: opt,
          value: opt,
        }))}
        placeholder={field.placeholder}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === "multi-select")
    return (
      <Select
        disabled={field.disabled}
        mode="multiple"
        options={(field.options || []).map((opt) => ({
          label: opt,
          value: opt,
        }))}
        placeholder={field.placeholder}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === "file") {
    return (
      <FileSelectInput
        disabled={field.disabled}
        onChange={onChange}
        placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
        value={value}
      />
    )
  }
  if (field.key === "imageUrl") {
    return (
      <ImageLibrarySelectInput
        disabled={field.disabled}
        onChange={onChange}
        placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
        value={value}
      />
    )
  }
  const relation = field.relation || relationFields[field.key]
  if (relation) {
    if (relation.resource === "file-folders") {
      return (
        <FolderRelationInput
          disabled={field.disabled}
          onChange={onChange}
          placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
          value={value}
        />
      )
    }
    return (
      <Select
        allowClear
        disabled={field.disabled}
        showSearch
        optionFilterProp="label"
        options={Object.entries(lookups[relation.resource] || {}).map(
          ([v, label]) => ({ value: v, label }),
        )}
        placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
        value={value}
        onChange={onChange}
      />
    )
  }
  if (field.type === "textarea")
    return (
      <Input.TextArea
        disabled={field.disabled}
        placeholder={field.placeholder}
        rows={3}
        value={value as string | undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
    )
  if (field.type === "date")
    return (
      <Input
        disabled={field.disabled}
        placeholder={field.placeholder}
        type="date"
        value={value as string | undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
    )
  if (field.type === "datetime")
    return (
      <Input
        disabled={field.disabled}
        placeholder={field.placeholder}
        type="datetime-local"
        value={value as string | undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
    )
  return (
    <Input
      disabled={field.disabled}
      placeholder={field.placeholder}
      value={value as string | undefined}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

interface LibraryImageOption {
  value: string
  title: string
  previewUrl: string
  fileId: string
  folderId?: string
  folderLabel?: string
}

interface FileLibraryOption {
  value: string
  title: string
  previewUrl: string
  fileId: string
  folderId?: string
  folderLabel?: string
  isImage: boolean
  mimeType: string
  extension: string
}

function FileSelectInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [openPicker, setOpenPicker] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [options, setOptions] = useState<FileLibraryOption[]>([])
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([])
  const [search, setSearch] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [draftValues, setDraftValues] = useState<string[]>([])
  const [folderChildrenMap, setFolderChildrenMap] = useState<Record<string, string[]>>({})
  const [folderPathMap, setFolderPathMap] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadOptions()
  }, [])

  useEffect(() => {
    if (openPicker) {
      setDraftValues(normalizeStringArray(value))
    }
  }, [openPicker, value])

  async function loadOptions() {
    const [filesResponse, foldersResponse] = await Promise.all([
      api.get("/records/files", { params: { pageSize: 200 } }),
      api.get("/records/file-folders", { params: { pageSize: 200 } }),
    ])
    const folderRows = normalizeFileFolderRows(foldersResponse.data.data || [])
    const folders = buildFolderPathMap(folderRows)
    setTreeData(buildFolderTree(folderRows))
    setFolderChildrenMap(buildFolderChildrenMap(folderRows))
    setFolderPathMap(folders)
    setOptions(
      (filesResponse.data.data || []).map((row: Record<string, unknown>) => ({
        value: String(row.id),
        title: String(row.title || row.originalName || row.id),
        previewUrl: String(row.publicUrl || ""),
        fileId: String(row.id),
        folderId: row.folderId ? String(row.folderId) : undefined,
        folderLabel: folders[String(row.folderId)],
        isImage: isImageFile(row),
        mimeType: String(row.mimeType || ""),
        extension: String(row.extension || ""),
      })),
    )
  }

  const selectedValues = normalizeStringArray(value)
  const selectedItems = selectedValues
    .map((item) => options.find((option) => option.value === item))
    .filter(Boolean) as FileLibraryOption[]
  const selectedDraftItems = draftValues
    .map((item) => options.find((option) => option.value === item))
    .filter(Boolean) as FileLibraryOption[]
  const visibleOptions = options.filter((option) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch = !keyword
      || option.title.toLowerCase().includes(keyword)
      || String(option.folderLabel || "").toLowerCase().includes(keyword)
      || option.extension.toLowerCase().includes(keyword)
    if (!matchesSearch) return false
    if (!selectedFolderId) return true
    const allowedFolders = new Set([selectedFolderId, ...(folderChildrenMap[selectedFolderId] || [])])
    return option.folderId ? allowedFolders.has(option.folderId) : false
  })
  const summaryValue = selectedItems.length === 0
    ? undefined
    : selectedItems.length === 1
      ? selectedItems[0].title
      : `${selectedItems.length} file đã chọn`

  return (
    <>
      <Space.Compact style={{ width: "100%" }}>
        <Input
          disabled
          placeholder={placeholder}
          style={{ width: "100%" }}
          value={summaryValue}
        />
        <Button disabled={disabled} onClick={() => setOpenPicker(true)}>
          Chọn file
        </Button>
      </Space.Compact>
      {selectedItems.length > 0 ? (
        <div className="file-selection-strip">
          {selectedItems.map((item) => (
            <div key={item.fileId} className="file-selection-pill">
              <span className="file-selection-pill-icon">{renderFileIcon(item)}</span>
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Modal
        destroyOnClose
        maskClosable={false}
        open={openPicker}
        title="Thư viện file"
        width={1080}
        onCancel={() => setOpenPicker(false)}
        footer={[
          <Button key="clear" onClick={() => { setDraftValues([]); onChange?.(undefined) }}>
            Bỏ chọn
          </Button>,
          <Button key="cancel" onClick={() => setOpenPicker(false)}>
            Đóng
          </Button>,
          <Button
            key="select"
            className="primary-glow"
            disabled={draftValues.length === 0}
            type="primary"
            onClick={() => {
              onChange?.(toSingleOrArray(draftValues))
              setOpenPicker(false)
            }}
          >
            Chọn {draftValues.length > 0 ? draftValues.length : ""} file
          </Button>,
        ]}
      >
        <div className="image-library-picker">
          <div className="image-library-sidebar">
            <div className="image-library-sidebar-header">
              <Typography.Text className="eyebrow">Folders</Typography.Text>
              <Typography.Title level={5}>Cây thư mục</Typography.Title>
            </div>
            <Button block onClick={() => setSelectedFolderId(undefined)}>
              Tất cả folder
            </Button>
            <Tree
              blockNode
              className="image-library-tree"
              defaultExpandAll
              filterTreeNode={(node) => String(node.title || "").toLowerCase().includes(search.trim().toLowerCase())}
              selectedKeys={selectedFolderId ? [selectedFolderId] : []}
              treeData={treeData}
              onSelect={(keys) => setSelectedFolderId(keys[0] ? String(keys[0]) : undefined)}
            />
          </div>
          <div className="image-library-browser">
            <div className="image-library-toolbar">
              <Input.Search
                allowClear
                placeholder="Tìm theo tên file, đuôi file hoặc folder"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button onClick={() => setOpenUpload(true)}>Upload file mới</Button>
            </div>
            <div className="image-library-current-folder">
              <Typography.Text type="secondary">
                {selectedFolderId ? folderPathMap[selectedFolderId] || "Folder đã chọn" : "Đang xem tất cả folder"}
              </Typography.Text>
            </div>
            <div className="image-library-content">
              <div className="image-library-grid">
                {visibleOptions.length === 0 ? (
                  <div className="image-library-empty">
                    <Empty description="Không có file phù hợp" />
                  </div>
                ) : (
                  visibleOptions.map((option) => {
                    const active = draftValues.includes(option.value)
                    return (
                      <button
                        key={option.fileId}
                        className={`image-library-card${active ? " active" : ""}`}
                        type="button"
                        onClick={() => setDraftValues((current) => toggleStringInList(current, option.value))}
                        onDoubleClick={() => {
                          const nextValues = toggleStringInList(draftValues, option.value)
                          onChange?.(toSingleOrArray(nextValues))
                          setOpenPicker(false)
                        }}
                      >
                        {option.isImage ? (
                          <img alt={option.title} src={option.previewUrl} />
                        ) : (
                          <div className="file-library-thumb">
                            <span className="file-library-icon">{renderFileIcon(option, true)}</span>
                            <span className="file-library-ext">{option.extension || "FILE"}</span>
                          </div>
                        )}
                        <div className="image-library-card-copy">
                          <strong>{option.title}</strong>
                          <span>{option.folderLabel || "Không có folder"}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="image-library-preview">
                {selectedDraftItems.length > 0 ? (
                  <>
                    <Typography.Title level={5}>{selectedDraftItems.length} file đang chọn</Typography.Title>
                    <div className="file-preview-list">
                      {selectedDraftItems.map((item) => (
                        <div key={item.fileId} className="file-preview-row">
                          {item.isImage ? (
                            <img alt={item.title} src={item.previewUrl} className="file-preview-image" />
                          ) : (
                            <div className="file-preview-fallback">{renderFileIcon(item, true)}</div>
                          )}
                          <div className="file-preview-copy">
                            <strong>{item.title}</strong>
                            <span>{item.folderLabel || "Không có folder"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty description="Chọn một hoặc nhiều file để xem preview" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        destroyOnClose
        footer={null}
        maskClosable={false}
        open={openUpload}
        title="Upload file vào folder"
        width={620}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          multiple
          onCancel={() => setOpenUpload(false)}
          onSuccess={(files) => {
            void loadOptions()
            const nextValues = Array.from(new Set([...draftValues, ...files.map((item) => item.id)]))
            setDraftValues(nextValues)
            onChange?.(toSingleOrArray(nextValues))
            setOpenUpload(false)
          }}
        />
      </Modal>
    </>
  )
}

function FolderRelationInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([])

  useEffect(() => {
    void loadFolders()
  }, [])

  async function loadFolders() {
    const response = await api.get("/records/file-folders", { params: { pageSize: 200 } })
    setTreeData(buildFolderTree(normalizeFileFolderRows(response.data.data || [])))
  }

  return (
    <TreeSelect
      allowClear
      disabled={disabled}
      placeholder={placeholder}
      showSearch
      treeData={treeData}
      treeDefaultExpandAll
      treeNodeFilterProp="title"
      value={value as string | undefined}
      onChange={onChange}
    />
  )
}

function ImageLibrarySelectInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [openPicker, setOpenPicker] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [options, setOptions] = useState<LibraryImageOption[]>([])
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([])
  const [search, setSearch] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [draftValue, setDraftValue] = useState<string>()
  const [folderChildrenMap, setFolderChildrenMap] = useState<Record<string, string[]>>({})
  const [folderPathMap, setFolderPathMap] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadOptions()
  }, [])

  useEffect(() => {
    if (openPicker) {
      setDraftValue(typeof value === "string" ? value : undefined)
    }
  }, [openPicker, value])

  async function loadOptions() {
    const [filesResponse, foldersResponse] = await Promise.all([
      api.get("/records/files", { params: { pageSize: 200 } }),
      api.get("/records/file-folders", { params: { pageSize: 200 } }),
    ])
    const folderRows = normalizeFileFolderRows(foldersResponse.data.data || [])
    const folders = buildFolderPathMap(folderRows)
    setTreeData(buildFolderTree(folderRows))
    setFolderChildrenMap(buildFolderChildrenMap(folderRows))
    setFolderPathMap(folders)
    const nextOptions = (filesResponse.data.data || [])
      .filter((row: Record<string, unknown>) => isImageFile(row))
      .map((row: Record<string, unknown>) => {
        const title = String(row.title || row.originalName || row.id)
        const folderLabel = folders[String(row.folderId)]
        const previewUrl = String(row.publicUrl || "")
        return {
          value: previewUrl,
          title: `${title}${folderLabel ? ` ${folderLabel}` : ""}`,
          previewUrl,
          fileId: String(row.id),
          folderId: row.folderId ? String(row.folderId) : undefined,
          folderLabel,
        }
      })
    setOptions(nextOptions)
  }

  const selected = options.find((option) => option.value === value)
  const selectedDraft = options.find((option) => option.value === draftValue)
  const visibleOptions = options.filter((option) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch = !keyword
      || option.title.toLowerCase().includes(keyword)
      || String(option.folderLabel || "").toLowerCase().includes(keyword)
    if (!matchesSearch) return false
    if (!selectedFolderId) return true
    const allowedFolders = new Set([selectedFolderId, ...(folderChildrenMap[selectedFolderId] || [])])
    return option.folderId ? allowedFolders.has(option.folderId) : false
  })

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      {typeof value === "string" && value ? (
        <div style={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 12, padding: 12, background: "rgba(255,255,255,0.8)" }}>
          <Image
            alt={selected?.title || "Hình ảnh đã chọn"}
            src={value}
            style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 10 }}
          />
          <Typography.Text style={{ display: "block", marginTop: 8 }}>
            {selected?.title || value}
          </Typography.Text>
        </div>
      ) : null}
      <Space.Compact style={{ width: "100%" }}>
        <Input
          disabled
          placeholder={placeholder}
          style={{ width: "100%" }}
          value={selected?.title || (value as string | undefined)}
        />
        <Button disabled={disabled} onClick={() => setOpenPicker(true)}>
          Chọn ảnh
        </Button>
      </Space.Compact>
      <Modal
        destroyOnClose
        maskClosable={false}
        open={openPicker}
        title="Thư viện hình ảnh"
        width={1080}
        onCancel={() => setOpenPicker(false)}
        footer={[
          <Button key="clear" onClick={() => { setDraftValue(undefined); onChange?.(undefined) }}>
            Bỏ chọn
          </Button>,
          <Button key="cancel" onClick={() => setOpenPicker(false)}>
            Đóng
          </Button>,
          <Button
            key="select"
            className="primary-glow"
            disabled={!draftValue}
            type="primary"
            onClick={() => {
              onChange?.(draftValue)
              setOpenPicker(false)
            }}
          >
            Chọn ảnh này
          </Button>,
        ]}
      >
        <div className="image-library-picker">
          <div className="image-library-sidebar">
            <div className="image-library-sidebar-header">
              <Typography.Text className="eyebrow">Folders</Typography.Text>
              <Typography.Title level={5}>Cây thư mục</Typography.Title>
            </div>
            <Button block onClick={() => setSelectedFolderId(undefined)}>
              Tất cả folder
            </Button>
            <Tree
              blockNode
              className="image-library-tree"
              defaultExpandAll
              filterTreeNode={(node) => String(node.title || "").toLowerCase().includes(search.trim().toLowerCase())}
              selectedKeys={selectedFolderId ? [selectedFolderId] : []}
              treeData={treeData}
              onSelect={(keys) => setSelectedFolderId(keys[0] ? String(keys[0]) : undefined)}
            />
          </div>
          <div className="image-library-browser">
            <div className="image-library-toolbar">
              <Input.Search
                allowClear
                placeholder="Tìm theo tên ảnh hoặc folder"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button onClick={() => setOpenUpload(true)}>Upload ảnh mới</Button>
            </div>
            <div className="image-library-current-folder">
              <Typography.Text type="secondary">
                {selectedFolderId
                  ? folderPathMap[selectedFolderId] || "Folder đã chọn"
                  : "Đang xem tất cả folder"}
              </Typography.Text>
            </div>
            <div className="image-library-content">
              <div className="image-library-grid">
                {visibleOptions.length === 0 ? (
                  <div className="image-library-empty">
                    <Empty description="Không có hình ảnh phù hợp" />
                  </div>
                ) : (
                  visibleOptions.map((option) => {
                    const active = draftValue === option.value
                    return (
                      <button
                        key={option.fileId}
                        className={`image-library-card${active ? " active" : ""}`}
                        type="button"
                        onClick={() => setDraftValue(option.value)}
                        onDoubleClick={() => {
                          onChange?.(option.value)
                          setOpenPicker(false)
                        }}
                      >
                        <img alt={option.title} src={option.previewUrl} />
                        <div className="image-library-card-copy">
                          <strong>{option.title.replace(` ${option.folderLabel || ""}`, "")}</strong>
                          <span>{option.folderLabel || "Không có folder"}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="image-library-preview">
                {selectedDraft ? (
                  <>
                    <Image alt={selectedDraft.title} src={selectedDraft.previewUrl} style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 12 }} />
                    <Typography.Title level={5}>{selectedDraft.title.replace(` ${selectedDraft.folderLabel || ""}`, "")}</Typography.Title>
                    <Typography.Text type="secondary">{selectedDraft.folderLabel || "Không có folder"}</Typography.Text>
                  </>
                ) : (
                  <Empty description="Chọn một ảnh để xem preview" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        destroyOnClose
        footer={null}
        maskClosable={false}
        open={openUpload}
        title="Upload ảnh vào thư viện"
        width={620}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          accept="image/*"
          multiple={false}
          onCancel={() => setOpenUpload(false)}
          onSuccess={(files) => {
            const uploadedUrl = files[0]?.publicUrl
            void loadOptions()
            if (uploadedUrl) {
              setDraftValue(uploadedUrl)
            }
            setOpenUpload(false)
          }}
        />
      </Modal>
    </Space>
  )
}

function isImageFile(row: Record<string, unknown>) {
  const mimeType = String(row.mimeType || "").toLowerCase()
  if (mimeType.startsWith("image/")) return true
  const extension = String(row.extension || "").toLowerCase()
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)
}

function buildFolderChildrenMap(rows: Array<{ id: string; parentId?: string | null }>) {
  const childrenByParent = new Map<string | null, string[]>()
  rows.forEach((row) => {
    const parentKey = row.parentId || null
    const list = childrenByParent.get(parentKey) || []
    list.push(row.id)
    childrenByParent.set(parentKey, list)
  })

  const descendantsById: Record<string, string[]> = {}
  const resolveChildren = (id: string): string[] => {
    if (descendantsById[id]) return descendantsById[id]
    const direct = childrenByParent.get(id) || []
    const all = direct.flatMap((childId) => [childId, ...resolveChildren(childId)])
    descendantsById[id] = Array.from(new Set(all))
    return descendantsById[id]
  }

  rows.forEach((row) => {
    resolveChildren(row.id)
  })

  return descendantsById
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String)
  if (value === undefined || value === null || value === "") return []
  return [String(value)]
}

function toSingleOrArray(values: string[]) {
  if (values.length === 0) return undefined
  if (values.length === 1) return values[0]
  return values
}

function toggleStringInList(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((item) => item !== nextValue)
    : [...values, nextValue]
}

function renderFileIcon(file: { mimeType?: string; extension?: string; isImage?: boolean }, large = false) {
  if (file.isImage) return <FileImageOutlined style={{ fontSize: large ? 42 : 16 }} />
  const mimeType = String(file.mimeType || "").toLowerCase()
  const extension = String(file.extension || "").toLowerCase()
  const iconStyle = { fontSize: large ? 42 : 16 }
  if (mimeType.includes("pdf") || extension === "pdf") return <FilePdfOutlined style={iconStyle} />
  if (mimeType.startsWith("text/") || ["doc", "docx", "txt", "rtf", "md", "xls", "xlsx", "csv"].includes(extension)) {
    return <FileTextOutlined style={iconStyle} />
  }
  return <FileOutlined style={iconStyle} />
}
