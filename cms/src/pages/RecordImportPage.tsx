import { ArrowLeftOutlined, DownloadOutlined, ImportOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons"
import { faker } from "@faker-js/faker"
import { Alert, Button, Card, Space, Table, Tag, Typography, Upload, message } from "antd"
import type { UploadProps } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import * as XLSX from "xlsx"
import { api } from "../api"
import { baseFields, CustomField, entityLabels, FieldSpec, relationFields } from "../models"
import { displayValue, loadRelationOptions, LookupMap } from "../relations"
import { getFieldCatalog } from "../view-settings"

const UNSUPPORTED_RESOURCES = new Set(["files", "service-orders"])

interface ImportDraftRow {
  __rowKey: string
  __lineNumber: number
  __saved?: boolean
  payload: Record<string, unknown>
  preview: Record<string, unknown>
  errors: string[]
}

export function RecordImportPage() {
  const { resource = "customers" } = useParams()
  const navigate = useNavigate()
  const [fields, setFields] = useState<FieldSpec[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [draftRows, setDraftRows] = useState<ImportDraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const unsupported = UNSUPPORTED_RESOURCES.has(resource)
  const baseKeySet = useMemo(
    () => new Set((baseFields[resource] || []).map((field) => field.key)),
    [resource],
  )
  const resolvers = useMemo(() => buildRelationResolvers(lookups), [lookups])
  const importableFields = useMemo(
    () => fields.filter((field) => !field.disabled),
    [fields],
  )
  const readyRows = draftRows.filter((row) => row.errors.length === 0 && !row.__saved)
  const invalidRows = draftRows.filter((row) => row.errors.length > 0)

  useEffect(() => {
    setDraftRows([])
    if (unsupported) {
      setFields([])
      setLookups({})
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      api.get("/settings/custom-fields", { params: { entityType: resource } }),
    ])
      .then(async ([fieldResponse]) => {
        const customFields = fieldResponse.data.data.filter(
          (field: CustomField) => field.isActive,
        )
        const nextFields = getFieldCatalog(resource, customFields)
        setFields(nextFields)
        const nextLookups = await loadRelationOptions(nextFields)
        setLookups(nextLookups)
      })
      .catch(() => {
        message.error("Không tải được cấu hình import")
      })
      .finally(() => setLoading(false))
  }, [resource, unsupported])

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    beforeUpload: async (file) => {
      try {
        const rows = await parseImportFile(file, importableFields, baseKeySet, resolvers)
        if (rows.length === 0) {
          message.warning("File import chưa có dòng dữ liệu hợp lệ")
          return false
        }
        setDraftRows(rows)
        message.success(`Đã đọc ${rows.length} dòng từ file Excel`)
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không đọc được file import")
      }
      return false
    },
    showUploadList: false,
    disabled: unsupported || loading,
  }

  const columns: ColumnsType<ImportDraftRow> = useMemo(
    () => [
      {
        title: "Dòng",
        dataIndex: "__lineNumber",
        key: "__lineNumber",
        width: 80,
        fixed: "left",
      },
      {
        title: "Trạng thái",
        key: "__status",
        width: 140,
        fixed: "left",
        render: (_, row) =>
          row.__saved ? (
            <Tag color="success">Đã lưu</Tag>
          ) : row.errors.length > 0 ? (
            <Tag color="error">Có lỗi</Tag>
          ) : (
            <Tag color="processing">Sẵn sàng</Tag>
          ),
      },
      {
        title: "Ghi chú",
        key: "__errors",
        width: 320,
        render: (_, row) =>
          row.errors.length > 0 ? (
            <Typography.Text type="danger">{row.errors.join("; ")}</Typography.Text>
          ) : (
            <Typography.Text type="secondary">
              {row.__saved ? "Đã lưu thành công" : "Có thể lưu"}
            </Typography.Text>
          ),
      },
      ...importableFields.map((field) => ({
        title: field.label,
        key: field.key,
        width: field.tableWidth,
        render: (_: unknown, row: ImportDraftRow) =>
          displayValue(field, row.preview[field.key], lookups),
      })),
    ],
    [importableFields, lookups],
  )

  async function downloadTemplate() {
    if (importableFields.length === 0) {
      message.warning("Chưa có cấu hình field để tạo file mẫu")
      return
    }

    const workbook = buildImportWorkbook(importableFields, lookups)
    XLSX.writeFile(workbook, `${resource}-import-template.xlsx`)
  }

  async function downloadFakeTemplate() {
    if (importableFields.length === 0) {
      message.warning("Chưa có cấu hình field để tạo file test")
      return
    }

    const rows = Array.from({ length: 15 }, (_, index) =>
      generateFakeImportRow(resource, importableFields, lookups, index),
    )
    const workbook = buildImportWorkbook(importableFields, lookups, rows)
    XLSX.writeFile(workbook, `${resource}-import-test.xlsx`)
  }

  async function saveRows() {
    if (readyRows.length === 0) {
      message.warning("Chưa có dòng nào sẵn sàng để lưu")
      return
    }

    setSaving(true)
    let successCount = 0
    const nextRows = [...draftRows]

    for (const row of draftRows) {
      if (row.errors.length > 0 || row.__saved) continue
      const index = nextRows.findIndex((item) => item.__rowKey === row.__rowKey)
      try {
        await api.post(`/records/${resource}`, row.payload)
        successCount += 1
        nextRows[index] = { ...row, __saved: true }
      } catch (error: any) {
        const errorMessage =
          String(error?.response?.data?.message || error?.message || "Lưu dữ liệu thất bại")
        nextRows[index] = {
          ...row,
          errors: [errorMessage],
        }
      }
      setDraftRows([...nextRows])
    }

    setSaving(false)
    if (successCount > 0) {
      message.success(`Đã lưu ${successCount} dòng`)
    }
    if (successCount === readyRows.length) {
      setTimeout(() => navigate(`/${resource}`), 400)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Import dữ liệu</Typography.Text>
          <Typography.Title level={2}>
            Import {entityLabels[resource] || resource}
          </Typography.Title>
        </div>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${resource}`)}>
            Quay lại danh sách
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>
            Tải file mẫu
          </Button>
          <Button icon={<ImportOutlined />} onClick={() => void downloadFakeTemplate()}>
            Tải data test
          </Button>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Upload file</Button>
          </Upload>
          <Button
            className="primary-glow"
            disabled={readyRows.length === 0}
            icon={<SaveOutlined />}
            loading={saving}
            type="primary"
            onClick={() => void saveRows()}
          >
            Lưu dữ liệu
          </Button>
        </Space>
      </div>

      {/* <div className="template-layout">
        <Card className="glass-card settings-card" loading={loading}>
          {unsupported ? (
            <Alert
              message="Module này chưa hỗ trợ import"
              description="Hiện tại màn import dùng cho các resource CRUD tiêu chuẩn. Module file upload và đơn hàng dịch vụ cần luồng riêng."
              showIcon
              type="warning"
            />
          ) : (
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <Alert
                message="Flow import"
                description="1. Tải file mẫu. 2. Điền dữ liệu trong sheet ImportData. 3. Upload để xem lại trên bảng. 4. Bấm Lưu dữ liệu để tạo bản ghi."
                showIcon
                type="info"
              />
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Có thể nhập field quan hệ bằng <strong>ID</strong> hoặc theo mã/tên đang hiển thị trong hệ thống. Các cột bắt buộc cần được điền trước khi lưu.
              </Typography.Paragraph>
            </Space>
          )}
        </Card>

        <Card className="glass-card settings-card" loading={loading}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Tổng quan file import
            </Typography.Title>
            <Space wrap>
              <Tag color="processing">{draftRows.length} dòng đọc được</Tag>
              <Tag color="success">{readyRows.length} dòng sẵn sàng</Tag>
              <Tag color="error">{invalidRows.length} dòng lỗi</Tag>
            </Space>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Những dòng lỗi sẽ được giữ lại trên bảng để bạn sửa file và upload lại.
            </Typography.Paragraph>
          </Space>
        </Card>
      </div> */}

      <Card className="table-card">
        {draftRows.length === 0 ? (
          <Alert
            message="Chưa có dữ liệu preview"
            description="Sau khi upload file Excel, hệ thống sẽ hiển thị bảng preview tại đây trước khi lưu."
            showIcon
            type="info"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={draftRows}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            rowKey="__rowKey"
            scroll={{ x: "max-content" }}
          />
        )}
      </Card>
    </>
  )
}

function buildFieldGuide(field: FieldSpec, lookups: LookupMap) {
  const relation = field.relation || relationFields[field.key]
  if (relation) {
    const samples = Object.entries(lookups[relation.resource] || {})
      .slice(0, 3)
      .map(([id, label]) => `${label} | ${id}`)
    return samples.length > 0
      ? `Nhập ID hoặc mã/tên gần đúng. Ví dụ: ${samples.join(" ; ")}`
      : "Nhập ID hoặc mã/tên đã có trong hệ thống"
  }
  if (field.type === "select" || field.type === "multi-select") {
    return field.options?.length
      ? `Chọn một trong: ${field.options.map((o) => (typeof o === "string" ? o : o.value)).join(", ")}`
      : "Có thể nhập nhiều giá trị, ngăn cách bằng dấu phẩy"
  }
  if (field.type === "number") return "Nhập số"
  if (field.type === "date") return "Định dạng gợi ý: YYYY-MM-DD"
  if (field.type === "datetime") return "Định dạng gợi ý: YYYY-MM-DD HH:mm hoặc YYYY-MM-DDTHH:mm"
  if (String(field.type || "") === "boolean") return "Nhập true/false, 1/0, yes/no"
  return "Nhập text"
}

function buildImportWorkbook(
  fields: FieldSpec[],
  lookups: LookupMap,
  dataRows: Array<Record<string, unknown>> = [],
) {
  const workbook = XLSX.utils.book_new()
  const sheetRows = [
    fields.map((field) => field.key),
    ...dataRows.map((row) => fields.map((field) => row[field.key] ?? "")),
  ]
  const dataSheet = XLSX.utils.aoa_to_sheet(sheetRows)
  dataSheet["!cols"] = fields.map((field) => ({
    wch: Math.max(14, Math.min(36, field.label.length + 6)),
  }))

  const guideRows = [
    ["field", "label", "type", "required", "guide"],
    ...fields.map((field) => [
      field.key,
      field.label,
      String(field.type || "text"),
      field.required ? "yes" : "no",
      buildFieldGuide(field, lookups),
    ]),
  ]
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows)
  guideSheet["!cols"] = [
    { wch: 24 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 72 },
  ]

  XLSX.utils.book_append_sheet(workbook, dataSheet, "ImportData")
  XLSX.utils.book_append_sheet(workbook, guideSheet, "HuongDan")
  return workbook
}

function generateFakeImportRow(
  resource: string,
  fields: FieldSpec[],
  lookups: LookupMap,
  index: number,
) {
  return Object.fromEntries(
    fields.map((field) => [field.key, generateFakeFieldValue(resource, field, lookups, index)]),
  )
}

function generateFakeFieldValue(
  resource: string,
  field: FieldSpec,
  lookups: LookupMap,
  index: number,
) {
  const relation = field.relation || relationFields[field.key]
  if (relation) {
    const ids = Object.keys(lookups[relation.resource] || {})
    return ids[index % ids.length] || ""
  }

  if (field.type === "select") {
    const opts = (field.options || []).map((o) => (typeof o === "string" ? o : o.value))
    return opts.length ? opts[index % opts.length] : ""
  }

  if (field.type === "multi-select") {
    const opts = (field.options || []).map((o) => (typeof o === "string" ? o : o.value))
    return opts.slice(0, Math.min(2, opts.length)).join(", ")
  }

  if (field.type === "number") {
    return fakeNumberByKey(field.key, index)
  }

  if (field.type === "date") {
    return faker.date.soon({ days: 30 }).toISOString().slice(0, 10)
  }

  if (field.type === "datetime") {
    return faker.date.soon({ days: 30 }).toISOString().slice(0, 16)
  }

  if (String(field.type || "") === "boolean") {
    return index % 2 === 0 ? "true" : "false"
  }

  return fakeTextByKey(resource, field.key, index)
}

function fakeTextByKey(resource: string, key: string, index: number) {
  const upperResource = resource.replace(/-/g, "_").toUpperCase()
  switch (key) {
    case "code":
    case "slug":
    case "batchNumber":
      return `${upperResource}_${faker.string.alphanumeric(6).toUpperCase()}`
    case "fullName":
    case "name":
      return faker.person.fullName()
    case "title":
      return faker.lorem.words({ min: 2, max: 4 })
    case "phone":
      return `0${faker.string.numeric(9)}`
    case "email":
      return faker.internet.email().toLowerCase()
    case "address":
      return faker.location.streetAddress()
    case "description":
    case "note":
    case "content":
    case "summary":
    case "diagnosis":
    case "nextAction":
    case "chiefComplaint":
    case "allergyWarning":
      return faker.lorem.sentence()
    case "doctorName":
    case "staffName":
      return faker.person.fullName()
    case "serviceName":
      return `Dich vu ${faker.commerce.productName()}`
    case "room":
      return `P${faker.number.int({ min: 1, max: 20 })}`
    case "position":
      return faker.person.jobTitle()
    case "source":
      return faker.helpers.arrayElement(["Facebook", "Tiktok", "Zalo", "Website"])
    case "category":
      return faker.helpers.arrayElement(["A", "B", "C", "Premium"])
    case "productType":
      return faker.helpers.arrayElement(["CONSUMABLE", "REUSABLE", "RETAIL", "SERVICE"])
    case "purchaseUnit":
    case "usageUnit":
    case "unit":
      return faker.helpers.arrayElement(["chai", "hop", "goi", "cai"])
    case "imageUrl":
      return `https://picsum.photos/seed/${resource}-${index}/1200/900`
    case "barcode":
    case "taxCode":
    case "idNumber":
      return faker.string.numeric(10 + (index % 3))
    default:
      return `${fieldLabelize(key)} ${index + 1}`
  }
}

function fakeNumberByKey(key: string, index: number) {
  switch (key) {
    case "totalSpent":
    case "sellingPrice":
    case "totalAmount":
    case "paidAmount":
    case "amount":
    case "unitPrice":
    case "debtLimit":
      return faker.number.int({ min: 100000, max: 5000000 })
    case "quantity":
    case "remainingQuantity":
    case "totalSessions":
    case "completedSessions":
      return faker.number.int({ min: 1, max: 20 })
    case "conversionFactor":
      return faker.number.int({ min: 1, max: 12 })
    case "intervalDays":
    case "paymentTermDays":
      return faker.number.int({ min: 1, max: 30 })
    case "minStockLevel":
      return faker.number.int({ min: 5, max: 100 })
    case "sortOrder":
      return index
    default:
      return faker.number.int({ min: 1, max: 100 })
  }
}

function fieldLabelize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
}

function buildRelationResolvers(lookups: LookupMap) {
  return Object.fromEntries(
    Object.entries(lookups).map(([resource, labelsById]) => {
      const aliasMap: Record<string, string> = {}
      Object.entries(labelsById).forEach(([id, label]) => {
        const aliases = new Set([
          id,
          label,
          ...label.split(" - "),
          ...label.split(","),
        ])
        aliases.forEach((alias) => {
          const token = normalizeToken(alias)
          if (token && !aliasMap[token]) aliasMap[token] = id
        })
      })
      return [resource, aliasMap]
    }),
  ) as Record<string, Record<string, string>>
}

async function parseImportFile(
  file: File,
  fields: FieldSpec[],
  baseKeySet: Set<string>,
  resolvers: Record<string, Record<string, string>>,
) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error("File Excel không có sheet dữ liệu")
  }
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  })

  return rows
    .map((rawRow, index) => normalizeImportRow(rawRow, index, fields, baseKeySet, resolvers))
    .filter(Boolean) as ImportDraftRow[]
}

function normalizeImportRow(
  rawRow: Record<string, unknown>,
  index: number,
  fields: FieldSpec[],
  baseKeySet: Set<string>,
  resolvers: Record<string, Record<string, string>>,
) {
  const normalizedSource = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [String(key).trim(), value]),
  )
  const hasContent = Object.values(normalizedSource).some((value) => !isEmptyValue(value))
  if (!hasContent) return null

  const payload: Record<string, unknown> = { customFields: {} }
  const preview: Record<string, unknown> = {}
  const errors: string[] = []

  fields.forEach((field) => {
    const rawValue = normalizedSource[field.key]
    if (isEmptyValue(rawValue)) {
      if (field.required) errors.push(`Thiếu ${field.label}`)
      return
    }
    const parsed = parseFieldValue(field, rawValue, resolvers)
    if (parsed.error) {
      errors.push(`${field.label}: ${parsed.error}`)
      return
    }
    if (parsed.value === undefined) return
    preview[field.key] = parsed.value
    if (baseKeySet.has(field.key)) {
      payload[field.key] = parsed.value
    } else {
      ;(payload.customFields as Record<string, unknown>)[field.key] = parsed.value
    }
  })

  if (Object.keys(payload.customFields as Record<string, unknown>).length === 0) {
    delete payload.customFields
  }

  return {
    __rowKey: `${index}-${Date.now()}`,
    __lineNumber: index + 2,
    payload,
    preview,
    errors,
  }
}

function parseFieldValue(
  field: FieldSpec,
  rawValue: unknown,
  resolvers: Record<string, Record<string, string>>,
): { value?: unknown; error?: string } {
  const relation = field.relation || relationFields[field.key]
  if (relation) {
    const resolved = resolveRelationValue(rawValue, relation.resource, resolvers)
    return resolved ? { value: resolved } : { error: "Không map được giá trị quan hệ" }
  }

  if (field.type === "number") {
    const value = Number(String(rawValue).replace(/,/g, "").trim())
    return Number.isFinite(value) ? { value } : { error: "Không phải số hợp lệ" }
  }

  if (field.type === "multi-select") {
    const values = splitMultiValue(rawValue)
    if (field.options?.length) {
      const optValues = (field.options).map((o) => (typeof o === "string" ? o : o.value))
      const normalizedOptions = new Map(optValues.map((v) => [normalizeToken(v), v]))
      const invalid = values.find((value) => !normalizedOptions.has(normalizeToken(value)))
      if (invalid) return { error: `Giá trị không hợp lệ: ${invalid}` }
      return { value: values.map((value) => normalizedOptions.get(normalizeToken(value)) || value) }
    }
    return { value: values }
  }

  if (field.type === "select") {
    if (!field.options?.length) return { value: String(rawValue).trim() }
    const optValues = (field.options).map((o) => (typeof o === "string" ? o : o.value))
    const matched = optValues.find((v) => normalizeToken(v) === normalizeToken(rawValue))
    return matched ? { value: matched } : { error: `Chỉ nhận: ${optValues.join(", ")}` }
  }

  if (field.type === "date") {
    const value = normalizeDateValue(rawValue)
    return value ? { value } : { error: "Sai định dạng ngày" }
  }

  if (field.type === "datetime") {
    const value = normalizeDateTimeValue(rawValue)
    return value ? { value } : { error: "Sai định dạng ngày giờ" }
  }

  if (String(field.type || "") === "boolean") {
    const value = normalizeBooleanValue(rawValue)
    return value === undefined ? { error: "Chỉ nhận true/false, 1/0, yes/no" } : { value }
  }

  return { value: String(rawValue).trim() }
}

function resolveRelationValue(
  rawValue: unknown,
  resource: string,
  resolvers: Record<string, Record<string, string>>,
) {
  const values = splitMultiValue(rawValue)
  const resolver = resolvers[resource] || {}
  const mapped = values
    .map((value) => resolver[normalizeToken(value)] || value.trim())
    .filter(Boolean)
  return Array.isArray(rawValue) ? mapped : mapped[0]
}

function splitMultiValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  return String(value)
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeBooleanValue(value: unknown) {
  const normalized = normalizeToken(value)
  if (["true", "1", "yes", "y", "co"].includes(normalized)) return true
  if (["false", "0", "no", "n", "khong"].includes(normalized)) return false
  return undefined
}

function normalizeDateValue(value: unknown) {
  const text = String(value || "").trim()
  if (!text) return undefined
  const normalized = text.replace(/\//g, "-")
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return undefined
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

function normalizeDateTimeValue(value: unknown) {
  const text = String(value || "").trim()
  if (!text) return undefined
  const normalized = text.replace(/\//g, "-").replace(" ", "T")
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    return normalized.length === 16 ? normalized : normalized.slice(0, 16)
  }
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return undefined
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function normalizeToken(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function isEmptyValue(value: unknown) {
  return value === undefined || value === null || String(value).trim() === ""
}
