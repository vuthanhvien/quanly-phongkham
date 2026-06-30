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
      title={<span>Sections <Tag style={{ marginLeft: 4 }}>{sections.length}</Tag></span>}
      extra={
        <Flex gap={4} wrap="wrap">
          <Button size="small" icon={<PlusOutlined />} onClick={() => onAddSection('container')}>Section container</Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => onAddSection('full')}>Section full</Button>
        </Flex>
      }
    >
      {sections.length === 0 ? (
        <Typography.Text type="secondary">No sections yet</Typography.Text>
      ) : (
        <Collapse
          size="small"
          items={sections.map((section) => ({
            key: section.id,
            label: (
              <Flex align="center" gap={8} wrap="wrap">
                <Typography.Text strong>{section.title || `Section ${section.order}`}</Typography.Text>
                <Tag>{section.width === 'full' ? 'Full width' : 'Container'}</Tag>
                <Tag color="blue">{section.blocks.length} blocks</Tag>
              </Flex>
            ),
            extra: (
              <Space size={6} onClick={(event) => event.stopPropagation()}>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => onOpenBlockComposer(section.id)}>
                  Add block
                </Button>
                <Popconfirm title="Delete this section?" onConfirm={() => onRemoveSection(section.id)}>
                  <Button size="small" danger>Delete</Button>
                </Popconfirm>
              </Space>
            ),
            children: (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Row gutter={8}>
                  <Col span={14}>
                    <Form.Item label="Section name" style={{ marginBottom: 8 }}>
                      <Input value={section.title} onChange={(e) => onUpdateSection(section.id, { sectionTitle: e.target.value })} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label="Width mode" style={{ marginBottom: 8 }}>
                      <Select
                        value={section.width}
                        onChange={(value) => onUpdateSection(section.id, { sectionWidth: value })}
                        options={[
                          { value: 'container', label: 'Container' },
                          { value: 'full', label: 'Full width' },
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
                          <Button size="small" onClick={(event) => { event.stopPropagation(); onSelectBlock(block.id) }}>Config</Button>
                          <Button size="small" danger onClick={(event) => { event.stopPropagation(); onRemoveBlock(block.id) }}>Delete</Button>
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
