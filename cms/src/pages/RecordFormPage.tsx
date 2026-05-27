import { useCreate, useOne, useUpdate } from '@refinedev/core';
import { Button, Card, Form, Input, InputNumber, Select, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { baseFields, CustomField, entityLabels, FieldSpec } from '../models';

export function RecordFormPage() {
  const { resource = 'customers', id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fields, setFields] = useState<FieldSpec[]>(baseFields[resource] || []);
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const recordQuery = useOne({ resource, id: id || '', queryOptions: { enabled: editing } }) as any;

  useEffect(() => {
    Promise.all([
      api.get('/settings/custom-fields', { params: { entityType: resource } }),
      api.get('/settings/views', { params: { entityType: resource } }),
    ]).then(([fieldResponse, viewResponse]) => {
      const custom = fieldResponse.data.data.filter((field: CustomField) => field.isActive);
      const expanded = [
        ...(baseFields[resource] || []),
        ...custom.map((field: CustomField) => ({
          key: field.key,
          label: field.label,
          type: field.dataType as FieldSpec['type'],
          required: field.required,
          options: field.options,
        })),
      ];
      const configured = viewResponse.data.data.find((view: { viewType: string }) => view.viewType === 'FORM')?.config?.fields;
      setFields(configured?.length ? expanded.filter((field) => configured.includes(field.key)) : expanded);
    });
  }, [resource]);

  useEffect(() => {
    const data = recordQuery.result?.data || recordQuery.query?.data?.data || recordQuery.data?.data?.data;
    if (data) form.setFieldsValue({ ...data, ...(data.customFields || {}) });
  }, [recordQuery.result, recordQuery.query?.data, form]);

  function submit(values: Record<string, unknown>) {
    const baseKeys = new Set((baseFields[resource] || []).map((field) => field.key));
    const payload: Record<string, unknown> = { customFields: {} };
    Object.entries(values).forEach(([key, value]) => {
      if (baseKeys.has(key)) payload[key] = value;
      else (payload.customFields as Record<string, unknown>)[key] = value;
    });
    const done = () => {
      message.success('Đã lưu dữ liệu');
      navigate(`/${resource}`);
    };
    if (editing) update({ resource, id: id!, values: payload }, { onSuccess: done });
    else create({ resource, values: payload }, { onSuccess: done });
  }

  return (
    <Card>
      <Typography.Title level={2}>
        {editing ? 'Cập nhật' : 'Thêm'} {entityLabels[resource] || resource}
      </Typography.Title>
      <Form form={form} layout="vertical" onFinish={submit} style={{ maxWidth: 720 }}>
        {fields.map((field) => (
          <Form.Item key={field.key} label={field.label} name={field.key} rules={[{ required: field.required, message: `Nhập ${field.label}` }]}>
            <FieldInput field={field} />
          </Form.Item>
        ))}
        <Space>
          <Button htmlType="submit" type="primary">Lưu</Button>
          <Button onClick={() => navigate(`/${resource}`)}>Hủy</Button>
        </Space>
      </Form>
    </Card>
  );
}

function FieldInput({ field }: { field: FieldSpec }) {
  if (field.type === 'number') return <InputNumber style={{ width: '100%' }} />;
  if (field.type === 'select') return <Select options={(field.options || []).map((value) => ({ label: value, value }))} />;
  if (field.type === 'textarea') return <Input.TextArea rows={3} />;
  if (field.type === 'date') return <Input type="date" />;
  if (field.type === 'datetime') return <Input type="datetime-local" />;
  return <Input />;
}
