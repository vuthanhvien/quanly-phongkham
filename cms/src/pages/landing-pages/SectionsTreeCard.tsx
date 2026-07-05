import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Flex, Form, Input, Popconfirm, Row, Col, Select, Space, Tag, Typography } from 'antd'
import type { LandingBlock } from '../../models'
import type { LandingSectionDraft } from './editor-helpers'

type Props = {
  sections: LandingSectionDraft[]
  selectedBlockId: string | null
  blockTypeOptions: Array<{ value: LandingBlock['type']; label: string }>
  blockTypeIcons: Record<LandingBlock['type'], React.ReactNode>
  blockPreview: (block: LandingBlock) => string
  onAddSection: (width: 'container' | 'full') => void
  onOpenBlockComposer: (sectionId: string) => void
  onRemoveSection: (sectionId: string) => void
  onUpdateSection: (sectionId: string, patch: Partial<Pick<LandingBlock, 'sectionTitle' | 'sectionWidth' | 'sectionOrder'>>) => void
  onSelectBlock: (blockId: string) => void
  onRemoveBlock: (blockId: string) => void
}

export function SectionsTreeCard({
  sections,
  selectedBlockId,
  blockTypeOptions,
  blockTypeIcons,
  blockPreview,
  onAddSection,
  onOpenBlockComposer,
  onRemoveSection,
  onUpdateSection,
  onSelectBlock,
  onRemoveBlock,
}: Props) {
  return (
    <Card
      className="glass-card"
      size="small"
      title={<span>Danh sách section <Tag style={{ marginLeft: 4 }}>{sections.length}</Tag></span>}
      extra={
        <Flex gap={4} wrap="wrap">
          <Button size="small" icon={<PlusOutlined />} onClick={() => onAddSection('container')}>Section trong khung</Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => onAddSection('full')}>Section tràn rộng</Button>
        </Flex>
      }
    >
      {sections.length === 0 ? (
        <Typography.Text type="secondary">Chưa có section nào</Typography.Text>
      ) : (
        <Collapse
          size="small"
          items={sections.map((section) => ({
            key: section.id,
            label: (
              <Flex align="center" gap={8} wrap="wrap">
                <Typography.Text strong>{section.title || `Khu vực ${section.order}`}</Typography.Text>
                <Tag>{section.width === 'full' ? 'Tràn chiều rộng' : 'Trong khung'}</Tag>
                <Tag color="blue">{section.blocks.length} block</Tag>
              </Flex>
            ),
            extra: (
              <Space size={6} onClick={(event) => event.stopPropagation()}>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => onOpenBlockComposer(section.id)}>
                  Thêm block
                </Button>
                <Popconfirm title="Xoá section này?" onConfirm={() => onRemoveSection(section.id)}>
                  <Button size="small" danger>Xoá</Button>
                </Popconfirm>
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Row gutter={8}>
                  <Col span={14}>
                    <Form.Item label="Tên section" style={{ marginBottom: 8 }}>
                      <Input value={section.title} onChange={(e) => onUpdateSection(section.id, { sectionTitle: e.target.value })} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label="Kiểu chiều rộng" style={{ marginBottom: 8 }}>
                      <Select
                        value={section.width}
                        onChange={(value) => onUpdateSection(section.id, { sectionWidth: value })}
                        options={[
                          { value: 'container', label: 'Trong khung' },
                          { value: 'full', label: 'Tràn chiều rộng' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {section.blocks.map((block, blockIndex) => (
                    <Card
                      key={block.id}
                      size="small"
                      hoverable
                      onClick={() => onSelectBlock(block.id)}
                      style={selectedBlockId === block.id ? { borderColor: '#1677ff' } : undefined}
                    >
                      <Flex align="center" justify="space-between" gap={12}>
                        <Flex align="center" gap={8}>
                          {blockTypeIcons[block.type]}
                          <div>
                            <Typography.Text strong>{blockTypeOptions.find((item) => item.value === block.type)?.label}</Typography.Text>
                            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              {blockPreview(block) || `Block ${blockIndex + 1}`}
                            </Typography.Text>
                          </div>
                        </Flex>
                        <Space size={4}>
                          <Button size="small" onClick={(event) => { event.stopPropagation(); onSelectBlock(block.id) }}>Cấu hình</Button>
                          <Button size="small" danger onClick={(event) => { event.stopPropagation(); onRemoveBlock(block.id) }}>Xoá</Button>
                        </Space>
                      </Flex>
                    </Card>
                  ))}
                </Space>
              </Space>
            ),
          }))}
        />
      )}
    </Card>
  )
}
