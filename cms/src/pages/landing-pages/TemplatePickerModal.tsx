import { Button, Card, Flex, Modal, Space, Tabs, Tag, Typography } from 'antd'
import type { PageTemplate } from './editor-helpers'

type Props = {
  open: boolean
  saving: boolean
  templates: PageTemplate[]
  onCancel: () => void
  onApply: (template: PageTemplate) => void
}

export function TemplatePickerModal({ open, saving, templates, onCancel, onApply }: Props) {
  return (
    <Modal footer={null} onCancel={onCancel} open={open} title="Chọn mẫu cho trang mới" width={780}>
      <Tabs
        style={{ marginTop: 4 }}
        items={[...new Set(templates.map((t) => t.category))].map((category) => ({
          key: category,
          label: category,
          children: (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {templates.filter((t) => t.category === category).map((template) => (
                <Card
                  hoverable
                  key={template.key}
                  onClick={() => void onApply(template)}
                  size="small"
                  style={{ cursor: 'pointer' }}
                >
                  <Flex gap={16} align="flex-start">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                        <Typography.Text strong>{template.label}</Typography.Text>
                        {template.page.blocks.length > 0 && (
                          <Tag color="blue">{template.page.blocks.length} block</Tag>
                        )}
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {template.description}
                      </Typography.Text>
                      {template.blockSummary.length > 0 && (
                        <Flex gap={4} wrap="wrap" style={{ marginTop: 8 }}>
                          {template.blockSummary.map((item) => (
                            <Tag key={item} style={{ fontSize: 11, margin: 0 }}>{item}</Tag>
                          ))}
                        </Flex>
                      )}
                    </div>
                    <Button
                      loading={saving}
                      size="small"
                      type="primary"
                      onClick={(e) => { e.stopPropagation(); void onApply(template) }}
                    >
                      {template.page.title ? 'Áp dụng & lưu' : 'Chọn'}
                    </Button>
                  </Flex>
                </Card>
              ))}
            </Space>
          ),
        }))}
      />
    </Modal>
  )
}
