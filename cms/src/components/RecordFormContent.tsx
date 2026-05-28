import { useCreate, useOne, useUpdate } from "@refinedev/core"
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { CustomField, entityLabels, FieldSpec, relationFields } from "../models"
import { loadRelationOptions, LookupMap } from "../relations"
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
  onCancel?: () => void
  onSuccess?: () => void
}

export function RecordFormContent({
  resource,
  id,
  compact,
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
    if (data) form.setFieldsValue({ ...data, ...(data.customFields || {}) })
  }, [recordQuery.result, recordQuery.query?.data, form])

  function submit(values: Record<string, unknown>) {
    const baseKeys = new Set(
      getFieldCatalog(resource, []).map((field) => field.key),
    )
    const payload: Record<string, unknown> = { customFields: {} }
    Object.entries(values).forEach(([key, value]) => {
      if (baseKeys.has(key)) payload[key] = value
      else (payload.customFields as Record<string, unknown>)[key] = value
    })
    const done = () => {
      message.success("Đã lưu dữ liệu")
      onSuccess?.()
    }
    if (editing)
      update({ resource, id: id!, values: payload }, { onSuccess: done })
    else create({ resource, values: payload }, { onSuccess: done })
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
        {fields.map((field) => (
          <Form.Item
            key={field.key}
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
        ))}
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
  const relation = field.relation || relationFields[field.key]
  if (relation) {
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
