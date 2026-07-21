import { useCreate, useOne, useUpdate } from "@refinedev/core"
import {
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons"
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Form,
  Grid,
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
import { UserOutlined } from "@ant-design/icons"
import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { api, resolveFileUrl } from "../api"
import { FileUploadPanel } from "./FileUploadPanel"
import { CustomField, entityLabels, FieldSpec, relationFields } from "../models"
import { getRelationMetaMap, loadRelationOptions, LookupMap, RelationLookupRecord } from "../relations"
import { getApiErrorMessage } from "../utils/apiError"
import { getFirstLookupValue } from "../utils/branchDefaults"
import { buildLocalDateTime, currentLocalDate, currentLocalDateTime, normalizeDateTimeValueForInput, normalizeDateValueForInput, parseClinicDateTime } from "../utils/datetime"
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

const APPOINTMENT_DURATION_OPTIONS = [
  { value: 15, label: "15 phút" },
  { value: 30, label: "30 phút" },
  { value: 45, label: "45 phút" },
  { value: 60, label: "60 phút" },
  { value: 90, label: "90 phút" },
  { value: 120, label: "120 phút" },
  { value: "custom", label: "Nhập giờ kết thúc" },
]

const WORK_SCHEDULE_REPEAT_OPTIONS = [
  { value: "NONE", label: "Không lặp" },
  { value: "DAILY", label: "Hàng ngày" },
  { value: "WEEKLY", label: "Hàng tuần" },
  { value: "MONTHLY", label: "Hàng tháng" },
]

const WORK_SCHEDULE_WEEKDAY_OPTIONS = [
  { value: "MON", label: "Th 2" },
  { value: "TUE", label: "Th 3" },
  { value: "WED", label: "Th 4" },
  { value: "THU", label: "Th 5" },
  { value: "FRI", label: "Th 6" },
  { value: "SAT", label: "Th 7" },
  { value: "SUN", label: "CN" },
]

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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate: create } = useCreate()
  const { mutate: update } = useUpdate()
  const isAppointmentForm = resource === "appointments"
  const isWorkScheduleForm = resource === "work-schedules"
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
      const normalizedData = { ...data, ...(data.customFields || {}) } as Record<string, unknown>
      fields.forEach((field) => {
        if (field.type === "date" && normalizedData[field.key]) {
          normalizedData[field.key] = normalizeDateValueForInput(normalizedData[field.key])
        }
        if (field.type === "datetime" && normalizedData[field.key]) {
          normalizedData[field.key] = normalizeDateTimeValueForInput(normalizedData[field.key])
        }
      })
      if (isAppointmentForm) {
        Object.assign(normalizedData, buildAppointmentEditorValues(normalizedData))
      }
      if (isWorkScheduleForm) {
        Object.assign(normalizedData, buildWorkScheduleEditorValues(normalizedData))
      }
      form.setFieldsValue(normalizedData)
      return
    }
    if (!editing && fields.length > 0) {
      const todayDate = currentLocalDate()
      const todayDatetime = currentLocalDateTime()
      const defaultValues = {
          ...Object.fromEntries(
            fields
              .filter((field) => field.type === "date")
              .map((field) => [field.key, todayDate]),
          ),
          ...Object.fromEntries(
            fields
              .filter((field) => field.type === "datetime")
              .map((field) => [field.key, todayDatetime]),
          ),
          ...Object.fromEntries(
            fields
              .filter((field) => field.defaultValue !== undefined)
              .map((field) => [field.key, field.defaultValue]),
          ),
          ...(initialValues || {}),
        }
      const nextDefaults = isAppointmentForm
        ? { ...defaultValues, ...buildAppointmentEditorValues(defaultValues) }
        : isWorkScheduleForm
          ? { ...defaultValues, ...buildWorkScheduleEditorValues(defaultValues) }
          : defaultValues
      form.setFieldsValue(nextDefaults)
    }
  }, [editing, fields, form, initialValues, isAppointmentForm, isWorkScheduleForm, recordQuery.result, recordQuery.query?.data, recordQuery.data?.data?.data])

  useEffect(() => {
    if (editing || fields.length === 0) return
    const defaultBranchId = getFirstLookupValue(lookups.branches)
    if (!defaultBranchId) return
    const nextValues: Record<string, string> = {}
    ;["branchId", "defaultBranchId"].forEach((key) => {
      const fieldExists = fields.some((field) => field.key === key)
      const currentValue = form.getFieldValue(key)
      const initialValue = initialValues?.[key]
      if (fieldExists && !currentValue && !initialValue) {
        nextValues[key] = defaultBranchId
      }
    })
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues)
    }
  }, [editing, fields, form, initialValues, lookups])

  function submit(values: Record<string, unknown>) {
    const mergedValues = { ...(initialValues || {}), ...values }
    if (isAppointmentForm) {
      applyAppointmentDateTimeValues(mergedValues)
    }
    if (isWorkScheduleForm) {
      applyWorkScheduleEditorValues(mergedValues)
    }
    const baseKeys = new Set(
      getFieldCatalog(resource, []).map((field) => field.key),
    )
    if (isWorkScheduleForm) {
      ;["seriesId", "recurrenceType", "recurrenceInterval", "recurrenceWeekdays", "recurrenceUntil"].forEach((key) => baseKeys.add(key))
    }
    const payload: Record<string, unknown> = { customFields: {} }
    Object.entries(mergedValues).forEach(([key, value]) => {
      if (baseKeys.has(key)) payload[key] = value
      else (payload.customFields as Record<string, unknown>)[key] = value
    })
    const done = () => {
      setSubmitError(null)
      message.success("Đã lưu dữ liệu")
      onSuccess?.()
    }
    if (editing)
      update(
        { resource, id: id!, values: payload },
        {
          onSuccess: done,
          onError: (error) => {
            const errorMessage = getApiErrorMessage(error, "Không thể lưu dữ liệu")
            setSubmitError(errorMessage)
            message.error(errorMessage)
          },
        },
      )
    else
      create(
        { resource, values: payload },
        {
          onSuccess: done,
          onError: (error) => {
            const errorMessage = getApiErrorMessage(error, "Không thể lưu dữ liệu")
            setSubmitError(errorMessage)
            message.error(errorMessage)
          },
        },
      )
  }

  return (
    <>
      {!compact && (
          <Typography.Title level={3}>
            {editing ? "Cập nhật" : "Thêm"} {entityLabels[resource] || resource}
          </Typography.Title>
      )}
      <Form
        className="record-form"
        form={form}
        layout="vertical"
        onValuesChange={() => {
          if (submitError) setSubmitError(null)
        }}
        onFinish={submit}
      >
        {submitError ? (
          <Alert
            closable
            message={submitError}
            showIcon
            style={{ marginBottom: 16 }}
            type="error"
            onClose={() => setSubmitError(null)}
          />
        ) : null}
        <Row gutter={[16, 0]}>
          {fields
            .filter((field) => {
              if (isAppointmentForm && (field.key === "startTime" || field.key === "endTime")) return false
              if (isWorkScheduleForm && (field.key === "workDate" || field.key === "startTime" || field.key === "endTime")) return false
              return true
            })
            .map((field) => (
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
          {isAppointmentForm ? <AppointmentDateTimeFields form={form} /> : null}
          {isWorkScheduleForm ? <WorkScheduleRepeatFields form={form} editing={editing} /> : null}
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

function WorkScheduleRepeatFields({
  form,
  editing,
}: {
  form: ReturnType<typeof Form.useForm>[0]
  editing: boolean
}) {
  const recurrenceType = (Form.useWatch("recurrenceType", form) as string | undefined) || "NONE"
  const scheduleDate = Form.useWatch("scheduleDate", form) as string | undefined

  useEffect(() => {
    if (recurrenceType !== "WEEKLY" || !scheduleDate) return
    const current = form.getFieldValue("recurrenceWeekdays")
    if (Array.isArray(current) && current.length > 0) return
    form.setFieldsValue({ recurrenceWeekdays: [weekdayCodeFromDate(scheduleDate)] })
  }, [form, recurrenceType, scheduleDate])

  return (
    <>
      <Col span={12} xs={24}>
        <Form.Item
          label="Ngày làm việc"
          name="scheduleDate"
          rules={[{ required: true, message: "Chọn ngày làm việc" }]}
        >
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={6} xs={24}>
        <Form.Item
          label="Giờ bắt đầu"
          name="scheduleStartTime"
          rules={[{ required: true, message: "Chọn giờ bắt đầu" }]}
        >
          <Input type="time" />
        </Form.Item>
      </Col>
      <Col span={6} xs={24}>
        <Form.Item
          label="Giờ kết thúc"
          name="scheduleEndTime"
          rules={[{ required: true, message: "Chọn giờ kết thúc" }]}
        >
          <Input type="time" />
        </Form.Item>
      </Col>
      <Col span={12} xs={24}>
        <Form.Item label="Lặp lại" name="recurrenceType">
          <Select options={WORK_SCHEDULE_REPEAT_OPTIONS} />
        </Form.Item>
      </Col>
      {recurrenceType !== "NONE" ? (
        <Col span={12} xs={24}>
          <Form.Item
            label="Lặp mỗi"
            name="recurrenceInterval"
            rules={[{ required: true, message: "Nhập chu kỳ lặp" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      ) : null}
      {recurrenceType === "WEEKLY" ? (
        <Col span={12} xs={24}>
          <Form.Item
            label="Lặp vào"
            name="recurrenceWeekdays"
            rules={[{ required: true, message: "Chọn ít nhất 1 thứ" }]}
          >
            <Select mode="multiple" options={WORK_SCHEDULE_WEEKDAY_OPTIONS} placeholder="Chọn các thứ lặp" />
          </Form.Item>
        </Col>
      ) : null}
      {recurrenceType !== "NONE" ? (
        <Col span={12} xs={24}>
          <Form.Item
            label="Kết thúc lặp"
            name="recurrenceUntil"
            rules={[{ required: true, message: "Chọn ngày kết thúc lặp" }]}
            extra={editing ? "Sửa bản ghi hiện tại sẽ cập nhật ca này; metadata chuỗi vẫn được giữ để dùng về sau." : undefined}
          >
            <Input type="date" />
          </Form.Item>
        </Col>
      ) : null}
    </>
  )
}

function AppointmentDateTimeFields({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const appointmentDate = Form.useWatch("appointmentDate", form) as string | undefined
  const appointmentStartTime = Form.useWatch("appointmentStartTime", form) as string | undefined
  const durationMode = Form.useWatch("appointmentDurationMinutes", form) as number | "custom" | undefined
  const useCustomEndTime = durationMode === "custom"

  useEffect(() => {
    if (useCustomEndTime) return
    if (!appointmentDate || !appointmentStartTime || !durationMode) return
    const start = dayjs(`${appointmentDate}T${appointmentStartTime}`)
    if (!start.isValid()) return
    const end = start.add(Number(durationMode), "minute")
    const nextEndTime = end.format("HH:mm")
    if (form.getFieldValue("appointmentEndTime") !== nextEndTime) {
      form.setFieldsValue({ appointmentEndTime: nextEndTime })
    }
  }, [appointmentDate, appointmentStartTime, durationMode, form, useCustomEndTime])

  return (
    <>
      <Col span={12} xs={24}>
        <Form.Item
          label="Ngày hẹn"
          name="appointmentDate"
          rules={[{ required: true, message: "Chọn ngày hẹn" }]}
        >
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={12} xs={24}>
        <Form.Item
          label="Giờ bắt đầu"
          name="appointmentStartTime"
          rules={[{ required: true, message: "Chọn giờ bắt đầu" }]}
        >
          <Input type="time" />
        </Form.Item>
      </Col>
      <Col span={12} xs={24}>
        <Form.Item
          label="Thời lượng"
          name="appointmentDurationMinutes"
          rules={[{ required: true, message: "Chọn thời lượng" }]}
        >
          <Select options={APPOINTMENT_DURATION_OPTIONS} placeholder="Chọn thời lượng" />
        </Form.Item>
      </Col>
      <Col span={12} xs={24}>
        <Form.Item
          label="Giờ kết thúc"
          name="appointmentEndTime"
          rules={useCustomEndTime ? [{ required: true, message: "Chọn giờ kết thúc" }] : []}
        >
          <Input disabled={!useCustomEndTime} type="time" />
        </Form.Item>
      </Col>
    </>
  )
}

function buildAppointmentEditorValues(values: Record<string, unknown>) {
  const start = parseClinicDateTime(values.startTime || values.appointmentDate || currentLocalDateTime())
  const end = parseClinicDateTime(values.endTime || values.startTime || currentLocalDateTime())
  const durationMinutes = Math.max(15, end.diff(start, "minute") || 60)
  const matchedDuration = APPOINTMENT_DURATION_OPTIONS.some((item) => item.value === durationMinutes)
  return {
    appointmentDate: start.isValid() ? start.format("YYYY-MM-DD") : currentLocalDate(),
    appointmentStartTime: start.isValid() ? start.format("HH:mm") : "09:00",
    appointmentDurationMinutes: matchedDuration ? durationMinutes : "custom",
    appointmentEndTime: end.isValid() ? end.format("HH:mm") : "10:00",
  }
}

function buildWorkScheduleEditorValues(values: Record<string, unknown>) {
  const workDate = normalizeDateValueForInput(values.workDate) || currentLocalDate()
  const start = values.startTime ? parseClinicDateTime(values.startTime) : null
  const end = values.endTime ? parseClinicDateTime(values.endTime) : null
  return {
    scheduleDate: workDate,
    scheduleStartTime: start?.isValid() ? start.format("HH:mm") : "08:00",
    scheduleEndTime: end?.isValid() ? end.format("HH:mm") : "17:00",
    recurrenceType: String(values.recurrenceType || "NONE").toUpperCase(),
    recurrenceInterval: Number(values.recurrenceInterval || 1),
    recurrenceWeekdays: typeof values.recurrenceWeekdays === "string"
      ? String(values.recurrenceWeekdays).split(",").map((item) => item.trim()).filter(Boolean)
      : Array.isArray(values.recurrenceWeekdays)
        ? values.recurrenceWeekdays.map(String)
        : [weekdayCodeFromDate(workDate)],
    recurrenceUntil: normalizeDateValueForInput(values.recurrenceUntil),
  }
}

function applyAppointmentDateTimeValues(values: Record<string, unknown>) {
  const dateText = String(values.appointmentDate || "").trim()
  const startText = String(values.appointmentStartTime || "").trim()
  if (!dateText || !startText) return

  const start = dayjs(`${dateText}T${startText}`)
  if (!start.isValid()) return

  const useCustomEndTime = values.appointmentDurationMinutes === "custom"
  const durationMinutes = Number(values.appointmentDurationMinutes || 60)
  const customEndText = String(values.appointmentEndTime || "").trim()
  let end = useCustomEndTime && customEndText
    ? dayjs(`${dateText}T${customEndText}`)
    : start.add(durationMinutes > 0 ? durationMinutes : 60, "minute")

  if (!end.isValid() || !end.isAfter(start)) {
    end = start.add(durationMinutes > 0 ? durationMinutes : 60, "minute")
  }

  values.startTime = buildLocalDateTime(start, start.hour(), start.minute())
  values.endTime = buildLocalDateTime(end, end.hour(), end.minute())

  delete values.appointmentDate
  delete values.appointmentStartTime
  delete values.appointmentDurationMinutes
  delete values.appointmentEndTime
}

function applyWorkScheduleEditorValues(values: Record<string, unknown>) {
  const scheduleDate = String(values.scheduleDate || "").trim()
  const scheduleStartTime = String(values.scheduleStartTime || "").trim()
  const scheduleEndTime = String(values.scheduleEndTime || "").trim()
  if (scheduleDate) values.workDate = scheduleDate
  if (scheduleDate && scheduleStartTime) values.startTime = `${scheduleDate}T${scheduleStartTime}`
  if (scheduleDate && scheduleEndTime) values.endTime = `${scheduleDate}T${scheduleEndTime}`

  const recurrenceType = String(values.recurrenceType || "NONE").toUpperCase()
  values.recurrenceType = recurrenceType
  values.recurrenceInterval = recurrenceType === "NONE" ? undefined : Math.max(1, Number(values.recurrenceInterval || 1))
  values.recurrenceWeekdays = recurrenceType === "WEEKLY"
    ? Array.isArray(values.recurrenceWeekdays)
      ? values.recurrenceWeekdays.map(String)
      : []
    : undefined
  values.recurrenceUntil = recurrenceType === "NONE" ? undefined : values.recurrenceUntil

  delete values.scheduleDate
  delete values.scheduleStartTime
  delete values.scheduleEndTime
}

function weekdayCodeFromDate(value: string) {
  const dayIndex = dayjs(value).day()
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dayIndex] || "MON"
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
        options={(field.options || []).map((opt) =>
          typeof opt === "string" ? { value: opt, label: opt } : opt,
        )}
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
        options={(field.options || []).map((opt) =>
          typeof opt === "string" ? { value: opt, label: opt } : opt,
        )}
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
        optionFilterProp="searchLabel"
        options={buildRelationSelectOptions(lookups, relation.lookupKey || relation.resource, relation.resource)}
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

function buildRelationSelectOptions(lookups: LookupMap, lookupKey: string, resource: string) {
  const labels = lookups[lookupKey] || {}
  const metaMap = getRelationMetaMap(lookups, lookupKey)
  const fallbackMetaMap = lookupKey === resource ? metaMap : getRelationMetaMap(lookups, resource)

  return Object.entries(labels).map(([value, label]) => {
    const meta = metaMap[value] || fallbackMetaMap[value]
    if (!meta || !["customers", "leads", "staff"].includes(resource)) {
      return { value, label, searchLabel: String(label) }
    }
    const primaryText = meta.code || meta.display_title || String(label)
    const secondaryText = meta.fullName || meta.name || meta.display_title || String(label)
    return {
      value,
      label: renderRelationSelectLabel(meta, primaryText, secondaryText),
      searchLabel: `${primaryText} ${secondaryText}`.trim(),
    }
  })
}

function renderRelationSelectLabel(meta: RelationLookupRecord, primaryText: string, secondaryText: string) {
  return (
    <span className="relation-entity-card compact">
      <Avatar
        className="relation-entity-card__avatar"
        icon={<UserOutlined />}
        size={24}
        src={meta.avatarUrl ? resolveFileUrl(String(meta.avatarUrl)) : undefined}
      />
      <span className="relation-entity-card__copy">
        <strong>{primaryText}</strong>
        <span>{secondaryText}</span>
      </span>
    </span>
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
  const screens = Grid.useBreakpoint()
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
        previewUrl: resolveFileUrl(String(row.publicUrl || "")),
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
        width={screens.lg ? 1080 : "calc(100vw - 16px)"}
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
              <Typography.Text className="eyebrow">Thư mục</Typography.Text>
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
        width={screens.md ? 620 : "calc(100vw - 16px)"}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          defaultFolderId={selectedFolderId}
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
  const screens = Grid.useBreakpoint()
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
        const previewUrl = resolveFileUrl(String(row.publicUrl || ""))
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
        <div
          style={{
            border: "1px solid var(--app-line)",
            borderRadius: "var(--app-radius)",
            padding: 12,
            background: "rgba(255,255,255,0.8)",
          }}
        >
          <Image
            alt={selected?.title || "Hình ảnh đã chọn"}
            src={value}
            style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: "var(--app-radius)" }}
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
        width={screens.lg ? 1080 : "calc(100vw - 16px)"}
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
              <Typography.Text className="eyebrow">Thư mục</Typography.Text>
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
                    <Image
                      alt={selectedDraft.title}
                      src={selectedDraft.previewUrl}
                      style={{
                        width: "100%",
                        maxHeight: 360,
                        objectFit: "contain",
                        borderRadius: "var(--app-radius)",
                      }}
                    />
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
        width={screens.md ? 620 : "calc(100vw - 16px)"}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          defaultFolderId={selectedFolderId}
          accept="image/*"
          multiple={false}
          onCancel={() => setOpenUpload(false)}
          onSuccess={(files) => {
            const uploadedUrl = resolveFileUrl(files[0]?.publicUrl)
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
