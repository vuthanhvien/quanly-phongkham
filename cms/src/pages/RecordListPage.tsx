import { useDelete, useList } from '@refinedev/core';
import { Button, Input, Popconfirm, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { baseFields, CustomField, entityLabels } from '../models';

export function RecordListPage() {
  const { resource = 'customers' } = useParams();
  const [search, setSearch] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [configuredColumns, setConfiguredColumns] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const query = useList({ resource, pagination: { currentPage: 1, pageSize: 50 }, filters: [{ field: 'search', operator: 'contains', value: search }] }) as any;
  const response = query.result || query.query?.data || query.data?.data;
  const rows = response?.data || [];
  const loading = query.query?.isLoading || query.isLoading;
  const { mutate: deleteRecord } = useDelete();

  useEffect(() => {
    Promise.all([
      api.get('/settings/custom-fields', { params: { entityType: resource } }),
      api.get('/settings/views', { params: { entityType: resource } }),
      api.get('/settings/print-templates', { params: { entityType: resource } }),
    ]).then(([fields, views, prints]) => {
      setCustomFields(fields.data.data.filter((field: CustomField) => field.isActive));
      const table = views.data.data.find((view: { viewType: string }) => view.viewType === 'TABLE');
      setConfiguredColumns(table?.config?.columns || []);
      setTemplates(prints.data.data);
    });
  }, [resource]);

  const allFields = [...(baseFields[resource] || []), ...customFields.map((field) => ({ key: field.key, label: field.label }))];
  const displayFields = configuredColumns.length ? allFields.filter((field) => configuredColumns.includes(field.key)) : allFields.slice(0, 6);
  const columns: ColumnsType<Record<string, any>> = useMemo(
    () => [
      ...displayFields.map((field) => ({
        title: field.label,
        dataIndex: field.key,
        key: field.key,
        render: (_: unknown, row: Record<string, any>) => String(row[field.key] ?? row.customFields?.[field.key] ?? ''),
      })),
      {
        title: 'Thao tác',
        key: 'action',
        render: (_: unknown, row: Record<string, any>) => (
          <Space>
            <Link to={`/${resource}/${row.id}/edit`}>Sửa</Link>
            {resource === 'customers' && <Button type="link" onClick={() => revealPhone(row.id)}>Xem SĐT</Button>}
            {templates[0] && <Button type="link" onClick={() => printRecord(templates[0].id, row.id)}>In</Button>}
            <Popconfirm title="Xóa bản ghi này?" onConfirm={() => deleteRecord({ resource, id: row.id }, { onSuccess: () => message.success('Đã xóa') })}>
              <Button danger type="link">Xóa</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [displayFields, resource, templates],
  );

  async function printRecord(templateId: string, recordId: string) {
    const html = (await api.get(`/settings/print-templates/${templateId}/render/${recordId}`, { responseType: 'text' })).data;
    const windowRef = window.open('', '_blank');
    if (windowRef) {
      windowRef.document.write(`<div class="print-sheet">${html}</div><script>window.print()</script>`);
      windowRef.document.close();
    }
  }

  async function revealPhone(recordId: string) {
    const response = await api.post(`/records/customers/${recordId}/reveal-phone`);
    message.info(`Số điện thoại: ${response.data.data.phone}`);
  }

  return (
    <>
      <div className="page-header">
        <Typography.Title level={2}>{entityLabels[resource] || resource}</Typography.Title>
        <Space>
          <Input.Search allowClear placeholder="Tìm kiếm" onSearch={setSearch} />
          <Link to={`/${resource}/create`}><Button type="primary">Thêm mới</Button></Link>
        </Space>
      </div>
      <Table columns={columns} dataSource={rows} loading={loading} rowKey="id" />
    </>
  );
}
