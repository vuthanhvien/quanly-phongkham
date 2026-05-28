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
import {
  baseFields,
  CustomField,
  entityLabels,
  FieldSpec,
  relationFields,
} from "../models"
import { loadRelationOptions, LookupMap } from "../relations"

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
  const [fields, setFields] = useState<FieldSpec[]>(baseFields[resource] || [])
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
        const custom = fieldResponse.data.data.filter(
          (field: CustomField) => field.isActive,
        )
        const expanded = [
          ...(baseFields[resource] || []),
          ...custom.map((field: CustomField) => ({
            key: field.key,
            label: field.label,
            type: field.dataType as FieldSpec["type"],
            required: field.required,
            options: field.options,
          })),
        ]
        const configured = viewResponse.data.data.find(
          (view: { viewType: string }) => view.viewType === "FORM",
        )?.config?.fields
        const nextFields = configured?.length
          ? expanded.filter((field) => configured.includes(field.key))
          : expanded
        setFields(nextFields)
        return loadRelationOptions(nextFields.map((field) => field.key))
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
      (baseFields[resource] || []).map((field) => field.key),
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
            label={field.label}
            name={field.key}
            rules={[
              { required: field.required, message: `Nhập ${field.label}` },
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
}: {
  field: FieldSpec
  lookups: LookupMap
}) {
  if (field.type === "number") return <InputNumber style={{ width: "100%" }} />
  if (field.type === "select")
    return (
      <Select
        options={(field.options || []).map((value) => ({
          label: value,
          value,
        }))}
      />
    )
  if (field.type === "multi-select")
    return (
      <Select
        mode="multiple"
        options={(field.options || []).map((value) => ({
          label: value,
          value,
        }))}
      />
    )
  const relation = relationFields[field.key]
  if (relation) {
    return (
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        options={Object.entries(lookups[relation.resource] || {}).map(
          ([value, label]) => ({ value, label }),
        )}
        placeholder={`Chọn ${field.label.toLowerCase()}`}
      />
    )
  }
  if (field.type === "textarea") return <Input.TextArea rows={3} />
  if (field.type === "date") return <Input type="date" />
  if (field.type === "datetime") return <Input type="datetime-local" />
  return <Input />
}
