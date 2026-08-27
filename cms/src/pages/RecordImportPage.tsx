import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined, ImportOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons"
import { CmsBackButton } from "../components/CmsBackButton"
import { faker } from "@faker-js/faker"
import { Alert, Button, Card, Dropdown, Select, Space, Table, Tabs, Tag, Typography, Upload, message } from "antd"
import type { UploadProps } from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import * as XLSX from "xlsx"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"
import { formatClinicDateTimeForApi, parseClinicDateTime } from "../utils/datetime"
import { baseFields, CustomField, entityLabels, FieldSpec, relationFields } from "../models"
import { displayValue, loadRelationOptions, LookupMap } from "../relations"
import { getFieldCatalog } from "../view-settings"

const UNSUPPORTED_RESOURCES = new Set(["files", "service-orders"])
const BUNDLE_RESOURCES = new Set(["customers", "leads", "staff"])
const PRODUCT_CATEGORY_FIELDS: FieldSpec[] = [
  { key: "code", label: "Mã", required: true, tableWidth: 150 },
  { key: "name", label: "Tên danh mục", required: true, tableWidth: 220 },
  { key: "parentCode", label: "Mã danh mục cha", tableWidth: 180 },
  { key: "description", label: "Mô tả", type: "textarea", tableWidth: 260 },
  { key: "sortOrder", label: "Thứ tự", type: "number", tableWidth: 100 },
  { key: "isActive", label: "Đang sử dụng", type: "checkbox", tableWidth: 140 },
]

interface BundleSheetDefinition {
  sheetName: string
  resource: string
  columns: string[]
  parentCodeColumn?: string
}

const BUNDLE_IMPORT_CONFIGS: Record<string, { related: BundleSheetDefinition[] }> = {
  customers: {
    related: [
      { sheetName: "appointments", resource: "appointments", parentCodeColumn: "customerCode", columns: ["customerCode", "branchId", "type", "startTime", "endTime", "doctorStaffId", "roomId", "equipmentId", "picStaffId", "status", "note"] },
      { sheetName: "medical-episodes", resource: "medical-episodes", parentCodeColumn: "customerCode", columns: ["customerCode", "branchId", "serviceName", "doctorName", "status", "chiefComplaint", "allergyWarning", "diagnosis", "operationDate"] },
      { sheetName: "treatments", resource: "treatments", parentCodeColumn: "customerCode", columns: ["customerCode", "branchId", "name", "totalSessions", "completedSessions", "intervalDays", "status"] },
      { sheetName: "consultations", resource: "consultations", parentCodeColumn: "customerCode", columns: ["customerCode", "branchId", "consultedAt", "consultantStaffId", "doctorStaffId", "status", "summary", "diagnosis", "nextAction"] },
      { sheetName: "customer-images", resource: "customer-images", parentCodeColumn: "customerCode", columns: ["customerCode", "branchId", "mediaType", "title", "imageUrl", "capturedAt", "diagnosisNote"] },
      { sheetName: "invoices", resource: "invoices", parentCodeColumn: "customerCode", columns: ["customerCode", "code", "branchId", "totalAmount", "paidAmount", "method", "status"] },
    ],
  },
  leads: {
    related: [
      { sheetName: "lead-activities", resource: "lead-activities", parentCodeColumn: "leadCode", columns: ["leadCode", "branchId", "activityType", "scheduledAt", "ownerStaffId", "status", "content"] },
    ],
  },
  staff: {
    related: [
      { sheetName: "work-contracts", resource: "work-contracts", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "contractType", "startDate", "endDate", "baseSalary", "position", "workingHoursPerDay", "workingDaysPerMonth", "status", "note"] },
      { sheetName: "staff-insurances", resource: "staff-insurances", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "insuranceType", "employeeRate", "employerRate", "salaryBase", "startDate", "endDate", "isActive", "note"] },
      { sheetName: "attendances", resource: "attendances", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "date", "checkIn", "checkOut", "status", "note"] },
      { sheetName: "leave-requests", resource: "leave-requests", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "startDate", "endDate", "leaveType", "status", "reason", "approvedById"] },
      { sheetName: "payrolls", resource: "payrolls", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "month", "year", "baseSalary", "workingDays", "actualDays", "overtimeHours", "bonus", "deduction", "netSalary", "status", "note"] },
      { sheetName: "work-schedules", resource: "work-schedules", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "workDate", "shiftLabel", "startTime", "endTime", "roomId", "status", "note"] },
      { sheetName: "staff-rewards", resource: "staff-rewards", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "type", "title", "description", "date", "issuedBy", "amount", "note"] },
      { sheetName: "staff-trainings", resource: "staff-trainings", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "trainingName", "provider", "startDate", "endDate", "certificateNumber", "expiryDate", "status", "note"] },
      { sheetName: "performance-reviews", resource: "performance-reviews", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "reviewMonth", "reviewYear", "reviewerId", "score", "status", "strengths", "improvements", "goals", "note"] },
      { sheetName: "position-histories", resource: "position-histories", parentCodeColumn: "staffCode", columns: ["staffCode", "branchId", "fromPosition", "toPosition", "fromDepartmentId", "toDepartmentId", "effectiveDate", "reason", "note"] },
      { sheetName: "branch-role-assignments", resource: "branch-role-assignments", parentCodeColumn: "staffCode", columns: ["staffCode", "userId", "branchId", "roleName", "roleKeys", "isActive"] },
      { sheetName: "user-accounts", resource: "user-accounts", parentCodeColumn: "staffCode", columns: ["staffCode", "email", "username", "password", "fullName", "role", "branchId"] },
    ],
  },
}

interface ImportDraftRow {
  __rowKey: string
  __lineNumber: number
  __saved?: boolean
  payload: Record<string, unknown>
  preview: Record<string, unknown>
  errors: string[]
}

export function RecordImportPage({ resource: resourceOverride }: { resource?: string }) {
  const { resource: routeResource } = useParams()
  const resource = resourceOverride || routeResource || "customers"
  const navigate = useNavigate()
  const [fields, setFields] = useState<FieldSpec[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [draftRows, setDraftRows] = useState<ImportDraftRow[]>([])
  const [bundleSheets, setBundleSheets] = useState<Record<string, Array<Record<string, unknown>>>>({})
  const [bundleSheetStats, setBundleSheetStats] = useState<Array<{ name: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testRowCount, setTestRowCount] = useState(1)

  const productCategoryMode = resource === "product-categories"
  const unsupported = UNSUPPORTED_RESOURCES.has(resource)
  const bundleMode = BUNDLE_RESOURCES.has(resource)
  const baseKeySet = useMemo(
    () => new Set((productCategoryMode ? PRODUCT_CATEGORY_FIELDS : baseFields[resource] || []).map((field) => field.key)),
    [resource, productCategoryMode],
  )
  const resolvers = useMemo(() => buildRelationResolvers(lookups), [lookups])
  const importableFields = useMemo(
    () => fields.filter((field) => !field.disabled),
    [fields],
  )
  const readyRows = draftRows.filter((row) => row.errors.length === 0 && !row.__saved)
  const invalidRows = draftRows.filter((row) => row.errors.length > 0)
  const bundleDefinitions = useMemo(
    () => (bundleMode ? buildBundleSheetDefinitions(resource, importableFields) : []),
    [bundleMode, importableFields, resource],
  )

  useEffect(() => {
    setDraftRows([])
    setBundleSheets({})
    setBundleSheetStats([])
    if (unsupported) {
      setFields([])
      setLookups({})
      setLoading(false)
      return
    }

    if (productCategoryMode) {
      setFields(PRODUCT_CATEGORY_FIELDS)
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
        message.error("Không tải được cấu hình nhập dữ liệu")
      })
      .finally(() => setLoading(false))
  }, [resource, unsupported, productCategoryMode])

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    beforeUpload: async (file) => {
      try {
        if (bundleMode) {
          const definitions = buildBundleSheetDefinitions(resource, importableFields)
          const parsed = await parseBundleImportFile(file, definitions, baseKeySet, importableFields)
          if (parsed.previewRows.length === 0 && parsed.stats.every((item) => item.count === 0)) {
            message.warning("Tệp nhập chưa có dữ liệu hợp lệ")
            return false
          }
          setBundleSheets(parsed.sheets)
          setBundleSheetStats(parsed.stats)
          setDraftRows(parsed.previewRows)
          message.success(`Đã đọc ${parsed.stats.reduce((sum, item) => sum + item.count, 0)} dòng từ file Excel`)
          return false
        }
        const rows = await parseImportFile(file, importableFields, baseKeySet, resolvers)
        if (rows.length === 0) {
          message.warning("Tệp nhập chưa có dòng dữ liệu hợp lệ")
          return false
        }
        setDraftRows(rows)
        message.success(`Đã đọc ${rows.length} dòng từ file Excel`)
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không đọc được tệp nhập")
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
      {
        title: "Thao tác",
        key: "actions",
        fixed: "right",
        width: 88,
        render: (_: unknown, row: ImportDraftRow) => (
          <Button
            danger
            disabled={row.__saved}
            icon={<DeleteOutlined />}
            size="small"
            type="text"
            onClick={() => removeDraftRow(row)}
          >
            Xóa
          </Button>
        ),
      },
    ],
    [importableFields, lookups, bundleMode, resource],
  )

  const bundleTabItems = useMemo(
    () =>
      bundleDefinitions.map((definition) => {
        const rows = bundleSheets[definition.sheetName] || []
        return {
          key: definition.sheetName,
          label: `${definition.sheetName} (${rows.length})`,
          children: (
            <Table
              columns={buildBundlePreviewColumns(definition, rows, (index) => removeBundleRow(definition.sheetName, index))}
              dataSource={rows.map((row, index) => ({ __bundleIndex: index, __rowKey: `${definition.sheetName}-${index}`, ...row }))}
              locale={{ emptyText: "Sheet này chưa có dữ liệu" }}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              rowKey="__rowKey"
              scroll={{ x: "max-content" }}
              size="small"
            />
          ),
        }
      }),
    [bundleDefinitions, bundleSheets, resource],
  )

  function removeDraftRow(row: ImportDraftRow) {
    setDraftRows((current) => current.filter((item) => item.__rowKey !== row.__rowKey))
    if (!bundleMode) return

    const customerCode = String(row.payload.code || row.preview.code || "").trim()
    if (!customerCode) return
    setBundleSheets((current) => {
      const next = Object.fromEntries(
        Object.entries(current).map(([sheetName, rows]) => [
          sheetName,
          sheetName === resource
            ? rows.filter((item) => String(item.code || "").trim() !== customerCode)
            : rows.filter((item) => String(item.customerCode || "").trim() !== customerCode),
        ]),
      )
      setBundleSheetStats(Object.entries(next).map(([name, rows]) => ({ name, count: rows.length })))
      return next
    })
  }

  function removeBundleRow(sheetName: string, rowIndex: number) {
    const removed = bundleSheets[sheetName]?.[rowIndex]
    if (!removed) return
    if (sheetName === resource) {
      const matchingDraft = draftRows.find((row) => String(row.payload.code || row.preview.code || "").trim() === String(removed.code || "").trim())
      if (matchingDraft) {
        removeDraftRow(matchingDraft)
        return
      }
    }
    setBundleSheets((current) => {
      const next = {
        ...current,
        [sheetName]: (current[sheetName] || []).filter((_, index) => index !== rowIndex),
      }
      setBundleSheetStats(Object.entries(next).map(([name, rows]) => ({ name, count: rows.length })))
      return next
    })
  }

  async function downloadTemplate() {
    if (importableFields.length === 0) {
      message.warning("Chưa có cấu hình field để tạo file mẫu")
      return
    }

    if (bundleMode) {
      const response = await api.get(`/records/${resource}/import-bundle`, { params: { template: 1, fake: 1, sampleSize: testRowCount } })
      const workbook = buildBundleWorkbookFromApi(response.data.data.sheets || [])
      XLSX.writeFile(workbook, `${resource}-import-template.xlsx`)
      return
    }

    if (productCategoryMode) {
      const workbook = buildImportWorkbook(importableFields, {}, [
        { code: "DA-LIEU", name: "Da liễu", parentCode: "", description: "Nhóm ngành da liễu", sortOrder: 1, isActive: true },
        { code: "DIEU-TRI-MUN", name: "Điều trị mụn", parentCode: "DA-LIEU", description: "", sortOrder: 1, isActive: true },
        { code: "MUN-CAP-DO-1", name: "Mụn cấp độ 1", parentCode: "DIEU-TRI-MUN", description: "", sortOrder: 1, isActive: true },
      ])
      XLSX.writeFile(workbook, "product-categories-import-template.xlsx")
      message.success("Đã tạo file mẫu Ngành / Nhóm / Loại")
      return
    }

    const rows = Array.from({ length: testRowCount }, (_, index) =>
      generateFakeImportRow(resource, importableFields, lookups, index),
    )
    const workbook = buildImportWorkbook(importableFields, lookups, rows)
    XLSX.writeFile(workbook, `${resource}-import-template.xlsx`)
    message.success(`Đã tạo file mẫu với ${testRowCount} dòng dữ liệu`)
  }

  async function downloadExportData() {
    if (bundleMode) {
      const response = await api.get(`/records/${resource}/import-bundle`)
      const workbook = buildBundleWorkbookFromApi(response.data.data.sheets || [])
      XLSX.writeFile(workbook, `${resource}-export.xlsx`)
      return
    }

    if (productCategoryMode) {
      const response = await api.get("/product-categories")
      const categories = response.data.data as Array<Record<string, unknown>>
      const byId = new Map(categories.map((category) => [String(category.id), category]))
      const rows = categories.map((category) => ({
        code: category.code || "",
        name: category.name || "",
        parentCode: byId.get(String(category.parentId || ""))?.code || "",
        description: category.description || "",
        sortOrder: category.sortOrder ?? 0,
        isActive: Boolean(category.isActive),
      }))
      XLSX.writeFile(buildImportWorkbook(importableFields, {}, rows), "product-categories-export.xlsx")
      message.success(`Đã export ${rows.length} dòng Ngành / Nhóm / Loại`)
      return
    }

    if (importableFields.length === 0) {
      message.warning("Chưa có cấu hình field để export")
      return
    }

    const sourceRows: Array<Record<string, unknown>> = []
    let page = 1
    let total = 0
    do {
      const response = await api.get(`/records/${resource}`, { params: { page, pageSize: 500 } })
      const data = Array.isArray(response.data?.data) ? response.data.data as Array<Record<string, unknown>> : []
      sourceRows.push(...data)
      total = Number(response.data?.total || sourceRows.length)
      page += 1
      if (data.length === 0) break
    } while (sourceRows.length < total)

    const categoryValues = new Map<string, string>()
    if (resource === "products") {
      const response = await api.get("/product-categories")
      const categories = Array.isArray(response.data?.data) ? response.data.data as Array<Record<string, unknown>> : []
      const byId = new Map(categories.map((category) => [String(category.id), category]))
      categories.forEach((category) => categoryValues.set(
        String(category.id),
        String(category.code || "").trim() || categoryPath(category, byId),
      ))
    }

    const rows = sourceRows.map((row) => Object.fromEntries(importableFields.map((field) => [
      field.key,
      exportFieldValue(field, row, lookups, categoryValues),
    ])))
    XLSX.writeFile(buildImportWorkbook(importableFields, lookups, rows), `${resource}-export.xlsx`)
    message.success(`Đã export ${rows.length} dòng dữ liệu hiện có`)
  }

  async function saveRows() {
    if (bundleMode) {
      if (draftRows.some((row) => row.errors.length > 0)) {
        message.warning("Vẫn còn lỗi ở sheet chính, vui lòng sửa file rồi upload lại")
        return
      }
      const totalRows = Object.values(bundleSheets).reduce((sum, rows) => sum + rows.length, 0)
      if (totalRows === 0) {
        message.warning("Chưa có dòng nào để nhập")
        return
      }
      setSaving(true)
      try {
        const response = await api.post(`/records/${resource}/import-bundle`, { sheets: bundleSheets })
        const importedSheets = response.data?.data?.importedSheets || []
        message.success(
          importedSheets.length > 0
            ? `Đã import ${importedSheets.reduce((sum: number, item: { count: number }) => sum + Number(item.count || 0), 0)} dòng`
            : "Đã nhập dữ liệu",
        )
        setTimeout(() => navigate(`/${resource}`), 400)
      } catch (error: any) {
        message.error(getApiErrorMessage(error, "Nhập dữ liệu thất bại"))
      } finally {
        setSaving(false)
      }
      return
    }

    if (readyRows.length === 0) {
      message.warning("Chưa có dòng nào sẵn sàng để lưu")
      return
    }

    setSaving(true)
    if (productCategoryMode) {
      try {
        const response = await api.post("/product-categories/import", {
          rows: readyRows.map((row) => row.payload),
        })
        const errors = response.data?.errors || []
        const savedCount = Number(response.data?.success || 0)
        const nextRows = draftRows.map((row) => {
          const error = errors.find((item: { rowIndex?: number }) => Number(item.rowIndex) === row.__lineNumber - 1)
          return row.errors.length > 0
            ? row
            : error
              ? { ...row, errors: [String(error.error || "Lưu dữ liệu thất bại")] }
              : { ...row, __saved: true }
        })
        setDraftRows(nextRows)
        if (savedCount > 0) message.success(`Đã lưu ${savedCount} dòng`)
        if (errors.length > 0) message.error(`${errors.length} dòng chưa được lưu; vui lòng kiểm tra bảng xem trước`)
        if (errors.length === 0) setTimeout(() => navigate(`/${resource}`), 400)
      } catch (error: any) {
        message.error(getApiErrorMessage(error, "Nhập dữ liệu thất bại"))
      } finally {
        setSaving(false)
      }
      return
    }

    let successCount = 0
    const nextRows = [...draftRows]

    for (const row of draftRows) {
      if (row.errors.length > 0 || row.__saved) continue
      const index = nextRows.findIndex((item) => item.__rowKey === row.__rowKey)
      try {
        await api.post(`/records/${resource}/import-upsert`, row.payload)
        successCount += 1
        nextRows[index] = { ...row, __saved: true }
      } catch (error: any) {
        const errorMessage = getApiErrorMessage(error, "Lưu dữ liệu thất bại")
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
        <Space align="center" size={12}>
          <CmsBackButton to={`/${resource}`} title="Quay lại danh sách" />
          <Typography.Title className="record-import-title" level={3}>
            Import {entityLabels[resource] || resource}
          </Typography.Title>
        </Space>
        <Space wrap>
          <Select
            aria-label="Số dòng dữ liệu mẫu"
            options={[
              { value: 1, label: '1 dòng' },
              { value: 10, label: '10 dòng' },
              { value: 50, label: '50 dòng' },
              { value: 100, label: '100 dòng' },
              { value: 250, label: '250 dòng' },
            ]}
            value={testRowCount}
            onChange={setTestRowCount}
            style={{ width: 120 }}
          />
          <Dropdown
            menu={{
              items: [
                { key: "template", icon: <DownloadOutlined />, label: bundleMode ? "Tải data mẫu" : "Tải file mẫu", onClick: () => void downloadTemplate() },
                { key: "export", icon: <ImportOutlined />, label: "Xuất dữ liệu hiện có", onClick: () => void downloadExportData() },
                {
                  key: "upload",
                  icon: <UploadOutlined />,
                  label: <Upload {...uploadProps}><span>Tải tệp lên</span></Upload>,
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button icon={<UploadOutlined />}>Tệp dữ liệu</Button>
          </Dropdown>
          <Button
            className="primary-glow"
            disabled={bundleMode ? Object.values(bundleSheets).every((rows) => rows.length === 0) : readyRows.length === 0}
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
              message="Phân hệ này chưa hỗ trợ nhập dữ liệu"
              description="Hiện tại màn nhập dữ liệu dùng cho các đối tượng CRUD tiêu chuẩn. Phân hệ tải tệp và đơn hàng dịch vụ cần luồng riêng."
              showIcon
              type="warning"
            />
          ) : (
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <Alert
                message="Quy trình nhập dữ liệu"
                description="1. Tải tệp mẫu. 2. Điền dữ liệu trong trang tính ImportData. 3. Tải tệp lên để xem lại trên bảng. 4. Bấm Lưu dữ liệu để tạo bản ghi."
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
        {bundleMode && bundleSheetStats.length > 0 ? (
          <Space wrap style={{ marginBottom: 16 }}>
            {bundleSheetStats.map((item) => (
              <Tag color="processing" key={item.name}>
                {item.name}: {item.count} dòng
              </Tag>
            ))}
          </Space>
        ) : null}
        {draftRows.length === 0 ? (
          <Alert
            message="Chưa có dữ liệu xem trước"
            description={productCategoryMode
              ? 'Dùng cột "parentCode" để xác định cha-con. Mã và tên danh mục là bắt buộc; mỗi cấp tối đa 3 cấp.'
              : "Sau khi tải tệp Excel lên, hệ thống sẽ hiển thị bảng xem trước tại đây trước khi lưu."}
            showIcon
            type="info"
          />
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={draftRows}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              rowKey="__rowKey"
              scroll={{ x: "max-content" }}
            />
            {bundleMode && bundleTabItems.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  Xem toàn bộ sheet bundle
                </Typography.Title>
                <Tabs items={bundleTabItems} />
              </div>
            ) : null}
          </>
        )}
      </Card>
    </>
  )
}

function buildBundlePreviewColumns(
  definition: BundleSheetDefinition,
  rows: Array<Record<string, unknown>>,
  onRemove: (rowIndex: number) => void,
): ColumnsType<Record<string, unknown>> {
  const columns = Array.from(new Set([
    ...definition.columns,
    ...rows.flatMap((row) => Object.keys(row)),
  ]))
  return [
    ...columns.map((column) => ({
    title: column,
    dataIndex: column,
    key: column,
    width: Math.max(140, Math.min(260, column.length * 12)),
    render: (value: unknown) => formatBundlePreviewValue(value),
    })),
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      width: 88,
      render: (_: unknown, row) => (
        <Button danger icon={<DeleteOutlined />} size="small" type="text" onClick={() => onRemove(Number(row.__bundleIndex))}>
          Xóa
        </Button>
      ),
    },
  ]
}

function formatBundlePreviewValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ")
  if (value === undefined || value === null || value === "") {
    return <Typography.Text type="secondary">-</Typography.Text>
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

function buildFieldGuide(field: FieldSpec, lookups: LookupMap) {
  if (field.key === "categoryId") return "Nhập mã Ngành / Nhóm / Loại, ví dụ: DV-DIEU-TRI"
  const relation = field.relation || relationFields[field.key]
  if (relation) {
    const samples = Object.entries(lookups[relation.resource] || {})
      .slice(0, 3)
      .map(([id, label]) => relationExternalValue(lookups, relation.resource, id) || label)
    return samples.length > 0
      ? `Nhập mã hoặc tên nghiệp vụ, không dùng ID. Ví dụ: ${samples.join(" ; ")}`
      : "Nhập mã hoặc tên nghiệp vụ đã có trong hệ thống, không dùng ID"
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

function buildBundleSheetDefinitions(resource: string, mainFields: FieldSpec[]): BundleSheetDefinition[] {
  const mainColumns = mainFields.map((field) => field.key)
  const related = BUNDLE_IMPORT_CONFIGS[resource]?.related || []
  return [
    {
      sheetName: resource,
      resource,
      columns: mainColumns,
    },
    ...related,
  ]
}

function buildBundleWorkbookFromApi(
  sheets: Array<{ name: string; columns: string[]; rows: Array<Record<string, unknown>> }>,
) {
  const workbook = XLSX.utils.book_new()
  const guideRows: Array<Array<string>> = [["sheet", "field", "guide"]]

  sheets.forEach((sheet) => {
    const sheetRows = [
      sheet.columns,
      ...(sheet.rows || []).map((row) => sheet.columns.map((column) => serializeWorkbookCell(row[column]))),
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
    worksheet["!cols"] = sheet.columns.map((column) => ({ wch: Math.max(14, Math.min(36, column.length + 6)) }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)

    sheet.columns.forEach((column) => {
      guideRows.push([sheet.name, column, buildBundleFieldGuide(sheet.name, column)])
    })
  })

  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows)
  guideSheet["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 72 }]
  XLSX.utils.book_append_sheet(workbook, guideSheet, "HuongDan")
  return workbook
}

function serializeWorkbookCell(value: unknown) {
  if (Array.isArray(value)) return value.join(", ")
  if (value === undefined || value === null) return ""
  return value
}

function buildBundleFieldGuide(sheetName: string, column: string) {
  if (column === "recordId") return "Giữ nguyên để update dòng liên kết đã export. Để trống để tạo mới."
  if (column.endsWith("Code")) return "Nhập code của bản ghi cha để map liên kết."
  if (column === "branchId" || column === "defaultBranchId") return "Nhập slug chi nhánh."
  if (column === "userId") return "Nhập email tài khoản."
  if (column === "username") return "Nhập username đăng nhập nếu muốn dùng thay cho email."
  if (column.toLowerCase().includes("staffid")) return "Nhập mã nhân viên."
  if (column.toLowerCase().includes("customerid")) return "Nhập mã khách hàng."
  if (column.toLowerCase().includes("leadid")) return "Nhập mã khách tiềm năng."
  if (column.toLowerCase().includes("departmentid")) return "Nhập mã phòng ban."
  if (column.toLowerCase().includes("invoiceid")) return "Nhập mã hóa đơn."
  return "Điền theo đúng dữ liệu đang export từ hệ thống."
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
    const ids = Object.keys(lookups[relation.lookupKey || relation.resource] || lookups[relation.resource] || {})
    const id = ids[index % ids.length]
    return id ? relationExternalValue(lookups, relation.lookupKey || relation.resource, id) : ""
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
    return parseClinicDateTime(faker.date.soon({ days: 30 })).format("YYYY-MM-DD")
  }

  if (field.type === "datetime") {
    return formatClinicDateTimeForApi(faker.date.soon({ days: 30 })) || ""
  }

  if (field.type === "checkbox" || String(field.type || "") === "boolean") {
    return index % 2 === 0 ? "true" : "false"
  }

  if (field.type === "html") return `<p>${faker.lorem.sentence()}</p>`

  return fakeTextByKey(resource, field.key, index)
}

function relationExternalValue(lookups: LookupMap, resource: string, id: string) {
  const meta = (lookups as unknown as Record<string, Record<string, Record<string, unknown>>>)[`${resource}__meta`]?.[id]
  if (!meta) return lookups[resource]?.[id] || ""
  return String(meta.code || meta.slug || meta.accountNumber || meta.email || meta.name || meta.fullName || meta.label || "")
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
    case "username":
      return `user_${index + 1}`
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
    case "staffName":
      return faker.person.fullName()
    case "serviceName":
      return `Dich vu ${faker.commerce.productName()}`
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
        // `loadRelationOptions` also exposes `${resource}__meta` maps. Their
        // values are record objects, not display labels, so they cannot be
        // tokenized as import aliases.
        if (typeof label !== "string") return
        const metadata = (lookups as unknown as Record<string, Record<string, Record<string, unknown>>>)[`${resource}__meta`]?.[id]
        const aliases = new Set([
          id,
          label,
          ...label.split(" - "),
          ...label.split(","),
          ...[metadata?.code, metadata?.slug, metadata?.accountNumber, metadata?.email, metadata?.name, metadata?.fullName]
            .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
            .map(String),
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

function exportFieldValue(
  field: FieldSpec,
  row: Record<string, unknown>,
  lookups: LookupMap,
  categoryPaths: Map<string, string>,
) {
  const value = row[field.key] ?? (row.customFields as Record<string, unknown> | undefined)?.[field.key]
  if (value === undefined || value === null) return ""
  if (field.key === "categoryId") return categoryPaths.get(String(value)) || String(value)
  const relation = field.relation || relationFields[field.key]
  if (relation) {
    const lookupResource = relation.lookupKey || relation.resource
    if (Array.isArray(value)) return value.map((item) => relationExternalValue(lookups, lookupResource, String(item))).join(", ")
    return relationExternalValue(lookups, lookupResource, String(value))
  }
  return value
}

function categoryPath(category: Record<string, unknown>, byId: Map<string, Record<string, unknown>>) {
  const names = [String(category.name || "")]
  const seen = new Set([String(category.id)])
  let parentId = String(category.parentId || "")
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    names.unshift(String(parent.name || ""))
    parentId = String(parent.parentId || "")
  }
  return names.filter(Boolean).join(" / ")
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

async function parseBundleImportFile(
  file: File,
  definitions: BundleSheetDefinition[],
  baseKeySet: Set<string>,
  mainFields: FieldSpec[],
) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false })
  const sheets: Record<string, Array<Record<string, unknown>>> = {}
  let previewRows: ImportDraftRow[] = []

  for (const definition of definitions) {
    const sheet = workbook.Sheets[definition.sheetName]
    const rows = sheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false })
      : []

    if (definition.resource === definitions[0].resource) {
      previewRows = rows
        .map((rawRow, index) => normalizeBundlePreviewRow(rawRow, index, mainFields, baseKeySet))
        .filter(Boolean) as ImportDraftRow[]
    }

    const sheetFields = buildBundleSheetFields(definition)
    sheets[definition.sheetName] = rows
      .map((row) => normalizeBundleSheetRow(row, sheetFields))
      .filter((row) => Object.values(row).some((value) => !isEmptyValue(value)))
  }

  return {
    sheets,
    previewRows,
    stats: definitions.map((definition) => ({
      name: definition.sheetName,
      count: sheets[definition.sheetName]?.length || 0,
    })),
  }
}

function normalizeBundlePreviewRow(
  rawRow: Record<string, unknown>,
  index: number,
  fields: FieldSpec[],
  baseKeySet: Set<string>,
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
    const parsed = parseBundleFieldValue(field, rawValue)
    preview[field.key] = parsed
    if (baseKeySet.has(field.key)) {
      payload[field.key] = parsed
    } else {
      ;(payload.customFields as Record<string, unknown>)[field.key] = parsed
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

function buildBundleSheetFields(definition: BundleSheetDefinition) {
  const availableFields = baseFields[definition.resource] || []
  return definition.columns.map((column) => {
    if (column === "recordId" || column === definition.parentCodeColumn) {
      return { key: column, label: column }
    }
    return availableFields.find((field) => field.key === column) || { key: column, label: column }
  })
}

function normalizeBundleSheetRow(
  rawRow: Record<string, unknown>,
  fields: Array<Pick<FieldSpec, "key" | "label" | "type">>,
) {
  const normalizedSource = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [String(key).trim(), value]),
  )
  const fieldByKey = new Map(fields.map((field) => [field.key, field]))
  const row: Record<string, unknown> = {}
  // Related sheets can carry custom fields that are configured dynamically on
  // the API. Preserve unknown headers so they arrive at the bundle importer.
  Object.keys(normalizedSource).forEach((key) => {
    const field = fieldByKey.get(key) || { key, label: key, type: "text" }
    const rawValue = normalizedSource[field.key]
    if (isEmptyValue(rawValue)) return
    const parsed = parseBundleFieldValue(field, rawValue)
    row[field.key] = parsed
  })
  return row
}

function parseBundleFieldValue(
  field: Pick<FieldSpec, "key" | "label" | "type">,
  rawValue: unknown,
) {
  if (field.key === "isActive") {
    const value = normalizeBooleanValue(rawValue)
    return value === undefined ? String(rawValue).trim() : value
  }

  if (field.type === "number") {
    const value = Number(String(rawValue).replace(/,/g, "").trim())
    return Number.isFinite(value) ? value : rawValue
  }

  if (field.type === "multi-select") {
    return splitMultiValue(rawValue)
  }

  if (field.type === "date") {
    return normalizeDateValue(rawValue) || String(rawValue).trim()
  }

  if (field.type === "datetime") {
    return normalizeDateTimeValue(rawValue) || String(rawValue).trim()
  }

  if (String(field.type || "") === "boolean") {
    const value = normalizeBooleanValue(rawValue)
    return value === undefined ? String(rawValue).trim() : value
  }

  return String(rawValue).trim()
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
    return formatClinicDateTimeForApi(normalized)
  }
  const parsed = parseClinicDateTime(normalized)
  return parsed.isValid() ? formatClinicDateTimeForApi(parsed) : undefined
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
