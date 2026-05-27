import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { baseFields, CustomField, entityLabels } from '../models';

interface Template {
  id: string;
  name: string;
  htmlTemplate: string;
}

export function SettingsPage() {
  const [entityType, setEntityType] = useState('customers');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fieldModal, setFieldModal] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const [fieldForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  useEffect(() => { void load(); }, [entityType]);

  async function load() {
    const [fieldResponse, viewResponse, templateResponse] = await Promise.all([
      api.get('/settings/custom-fields', { params: { entityType } }),
      api.get('/settings/views', { params: { entityType } }),
      api.get('/settings/print-templates', { params: { entityType } }),
    ]);
    setFields(fieldResponse.data.data);
    const views = viewResponse.data.data;
    setTableColumns(views.find((item: { viewType: string }) => item.viewType === 'TABLE')?.config?.columns || []);
    setFormFields(views.find((item: { viewType: string }) => item.viewType === 'FORM')?.config?.fields || []);
    setTemplates(templateResponse.data.data);
  }

  const options = useMemo(
    () => [...(baseFields[entityType] || []), ...fields.filter((field) => field.isActive).map((field) => ({ key: field.key, label: field.label }))]
      .map((field) => ({ label: field.label, value: field.key })),
    [entityType, fields],
  );

  async function addField(values: Record<string, any>) {
    await api.post('/settings/custom-fields', {
      ...values,
      entityType,
      options: values.options ? String(values.options).split(',').map((value) => value.trim()) : undefined,
    });
    setFieldModal(false);
    fieldForm.resetFields();
    message.success('Đã thêm trường tùy biến');
    await load();
  }

  async function deleteField(id: string) {
    await api.delete(`/settings/custom-fields/${id}`);
    await load();
  }

  async function saveView() {
    await Promise.all([
      api.put(`/settings/views/${entityType}/TABLE`, { config: { columns: tableColumns } }),
      api.put(`/settings/views/${entityType}/FORM`, { config: { fields: formFields } }),
    ]);
    message.success('Đã lưu cấu hình bảng và form');
  }

  async function addTemplate(values: Record<string, unknown>) {
    await api.post('/settings/print-templates', { ...values, entityType });
    setTemplateModal(false);
    templateForm.resetFields();
    message.success('Đã lưu mẫu in');
    await load();
  }

  return (
    <>
      <div className="page-header">
        <Typography.Title level={2}>Cấu hình động</Typography.Title>
        <Select value={entityType} onChange={setEntityType} style={{ width: 240 }} options={Object.entries(entityLabels).map(([value, label]) => ({ value, label }))} />
      </div>
      <div className="settings-grid">
        <Card title="Custom fields" extra={<Button onClick={() => setFieldModal(true)}>Thêm field</Button>}>
          <Table size="small" pagination={false} rowKey="id" dataSource={fields} columns={[
            { title: 'Nhãn', dataIndex: 'label' },
            { title: 'Key', dataIndex: 'key' },
            { title: 'Kiểu', dataIndex: 'dataType' },
            { title: '', render: (_, row) => <Button danger type="link" onClick={() => deleteField(row.id)}>Xóa</Button> },
          ]} />
        </Card>
        <Card title="Hiển thị table / form">
          <Typography.Text strong>Cột trên bảng</Typography.Text>
          <Checkbox.Group style={{ display: 'grid', margin: '12px 0 20px' }} options={options} value={tableColumns} onChange={(value) => setTableColumns(value as string[])} />
          <Typography.Text strong>Field trên form</Typography.Text>
          <Checkbox.Group style={{ display: 'grid', margin: '12px 0 20px' }} options={options} value={formFields} onChange={(value) => setFormFields(value as string[])} />
          <Button type="primary" onClick={saveView}>Lưu bố cục</Button>
        </Card>
        <Card title="Mẫu in" extra={<Button onClick={() => setTemplateModal(true)}>Thêm mẫu</Button>}>
          <Table size="small" pagination={false} rowKey="id" dataSource={templates} columns={[
            { title: 'Tên mẫu', dataIndex: 'name' },
            { title: 'Biến sử dụng', render: () => '{{field_key}}' },
          ]} />
        </Card>
      </div>
      <Modal title="Thêm custom field" open={fieldModal} footer={null} onCancel={() => setFieldModal(false)}>
        <Form form={fieldForm} layout="vertical" onFinish={addField}>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="key" label="Key dữ liệu" rules={[{ required: true }]}><Input placeholder="vi_du_field" /></Form.Item>
          <Form.Item name="dataType" label="Kiểu" initialValue="text"><Select options={['text', 'number', 'date', 'boolean', 'select'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="options" label="Lựa chọn (ngăn cách dấu phẩy)"><Input /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}><InputNumber /></Form.Item>
          <Form.Item name="required" valuePropName="checked"><Checkbox>Bắt buộc nhập</Checkbox></Form.Item>
          <Button htmlType="submit" type="primary">Lưu field</Button>
        </Form>
      </Modal>
      <Modal title="Thêm mẫu in HTML" open={templateModal} footer={null} onCancel={() => setTemplateModal(false)}>
        <Form form={templateForm} layout="vertical" onFinish={addTemplate}>
          <Form.Item name="name" label="Tên mẫu" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="htmlTemplate" label="HTML, dùng {{key}} để lấy dữ liệu" rules={[{ required: true }]}>
            <Input.TextArea rows={9} placeholder={'<h1>Phiếu</h1><p>Khách: {{fullName}}</p>'} />
          </Form.Item>
          <Button htmlType="submit" type="primary">Lưu mẫu in</Button>
        </Form>
      </Modal>
    </>
  );
}

