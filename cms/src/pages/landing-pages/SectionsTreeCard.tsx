import { BgColorsOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Col, Flex, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { ImagePickerInput } from '../../components/ImagePickerInput'
import type { LandingBackgroundStyle, LandingBlock, LandingElementStyle, LandingSpacing } from '../../models'
import type { LandingSectionDraft } from './editor-helpers'

type Props = {
  sections: LandingSectionDraft[]
  selectedBlockId: string | null
  blockTypeOptions: Array<{ value: LandingBlock['type']; label: string }>
  blockTypeIcons: Record<LandingBlock['type'], React.ReactNode>
  blockPreview: (block: LandingBlock) => string
  onAddSection: (width: 'container' | 'full') => void
  onOpenBlockComposer: (sectionId: string) => void
  onEditBlock: (blockId: string) => void
  onRemoveSection: (sectionId: string) => void
  onUpdateSection: (sectionId: string, patch: Partial<Pick<LandingBlock, 'sectionTitle' | 'sectionWidth' | 'sectionOrder' | 'sectionStyle'>>) => void
  onSelectBlock: (blockId: string) => void
  onUpdateBlock: (blockId: string, patch: Partial<Pick<LandingBlock, 'blockStyle'>>) => void
  onRemoveBlock: (blockId: string) => void
}

function normalizeSpacing(value?: LandingSpacing) {
  return {
    top: Math.max(0, Number(value?.top || 0) || 0),
    right: Math.max(0, Number(value?.right || 0) || 0),
    bottom: Math.max(0, Number(value?.bottom || 0) || 0),
    left: Math.max(0, Number(value?.left || 0) || 0),
  }
}

function cleanupStyle(value?: LandingElementStyle): LandingElementStyle | undefined {
  if (!value) return undefined
  const padding = normalizeSpacing(value.padding)
  const margin = normalizeSpacing(value.margin)
  const hasPadding = Object.values(padding).some((item) => item > 0)
  const hasMargin = Object.values(margin).some((item) => item > 0)
  const backgroundType = value.background?.type || 'none'
  const background =
    backgroundType === 'none'
      ? undefined
      : {
          type: backgroundType,
          color: value.background?.color || '#ffffff',
          imageUrl: value.background?.imageUrl || '',
          videoUrl: value.background?.videoUrl || '',
        }
  if (!hasPadding && !hasMargin && !background) return undefined
  return {
    padding: hasPadding ? padding : undefined,
    margin: hasMargin ? margin : undefined,
    background,
  }
}

function updateSpacing(style: LandingElementStyle | undefined, key: 'padding' | 'margin', side: keyof LandingSpacing, value: number | null) {
  const current = normalizeSpacing(style?.[key])
  return cleanupStyle({
    ...style,
    [key]: {
      ...current,
      [side]: Math.max(0, Number(value || 0) || 0),
    },
  })
}

function updateBackground(style: LandingElementStyle | undefined, patch: Partial<LandingBackgroundStyle>) {
  return cleanupStyle({
    ...style,
    background: {
      type: style?.background?.type || 'none',
      color: style?.background?.color || '#ffffff',
      imageUrl: style?.background?.imageUrl || '',
      videoUrl: style?.background?.videoUrl || '',
      ...patch,
    },
  })
}

function SpacingEditor({
  label,
  value,
  onChange,
}: {
  label: string
  value?: LandingSpacing
  onChange: (side: keyof LandingSpacing, value: number | null) => void
}) {
  const spacing = normalizeSpacing(value)
  return (
    <Form.Item label={label} style={{ marginBottom: 8 }}>
      <Row gutter={8}>
        <Col span={6}><InputNumber min={0} addonBefore="T" value={spacing.top} onChange={(next) => onChange('top', next)} style={{ width: '100%' }} /></Col>
        <Col span={6}><InputNumber min={0} addonBefore="R" value={spacing.right} onChange={(next) => onChange('right', next)} style={{ width: '100%' }} /></Col>
        <Col span={6}><InputNumber min={0} addonBefore="B" value={spacing.bottom} onChange={(next) => onChange('bottom', next)} style={{ width: '100%' }} /></Col>
        <Col span={6}><InputNumber min={0} addonBefore="L" value={spacing.left} onChange={(next) => onChange('left', next)} style={{ width: '100%' }} /></Col>
      </Row>
    </Form.Item>
  )
}

function StylePanel({
  value,
  onChange,
}: {
  value?: LandingElementStyle
  onChange: (next?: LandingElementStyle) => void
}) {
  const backgroundType = value?.background?.type || 'none'

  return (
    <Card size="small" style={{ background: '#fafafa' }}>
      <Form layout="vertical" size="small">
        <SpacingEditor label="Padding (px)" value={value?.padding} onChange={(side, next) => onChange(updateSpacing(value, 'padding', side, next))} />
        <SpacingEditor label="Margin (px)" value={value?.margin} onChange={(side, next) => onChange(updateSpacing(value, 'margin', side, next))} />
        <Form.Item label="Background" style={{ marginBottom: 8 }}>
          <Select
            value={backgroundType}
            onChange={(next) => onChange(updateBackground(value, { type: next }))}
            options={[
              { value: 'none', label: 'Không dùng' },
              { value: 'color', label: 'Màu nền' },
              { value: 'image', label: 'Ảnh nền' },
              { value: 'video', label: 'Video nền' },
            ]}
          />
        </Form.Item>
        {backgroundType === 'color' ? (
          <Form.Item label="Màu nền" style={{ marginBottom: 0 }}>
            <Input type="color" value={value?.background?.color || '#ffffff'} onChange={(event) => onChange(updateBackground(value, { color: event.target.value }))} />
          </Form.Item>
        ) : null}
        {backgroundType === 'image' ? (
          <Form.Item label="Ảnh nền" style={{ marginBottom: 0 }}>
            <ImagePickerInput value={value?.background?.imageUrl || ''} onChange={(imageUrl) => onChange(updateBackground(value, { imageUrl }))} />
          </Form.Item>
        ) : null}
        {backgroundType === 'video' ? (
          <Form.Item label="Video nền" style={{ marginBottom: 0 }}>
            <Input
              value={value?.background?.videoUrl || ''}
              placeholder="https://...mp4 hoặc link video"
              onChange={(event) => onChange(updateBackground(value, { videoUrl: event.target.value }))}
            />
          </Form.Item>
        ) : null}
      </Form>
    </Card>
  )
}

export function SectionsTreeCard({
  sections,
  selectedBlockId,
  blockTypeOptions,
  blockTypeIcons,
  blockPreview,
  onAddSection,
  onOpenBlockComposer,
  onEditBlock,
  onRemoveSection,
  onUpdateSection,
  onSelectBlock,
  onUpdateBlock,
  onRemoveBlock,
}: Props) {
  const [openSectionStyleId, setOpenSectionStyleId] = useState<string | null>(null)
  const [openBlockStyleId, setOpenBlockStyleId] = useState<string | null>(null)

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
                <Button
                  size="small"
                  icon={<BgColorsOutlined />}
                  onClick={() => setOpenSectionStyleId((current) => (current === section.id ? null : section.id))}
                />
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
                      <Input value={section.title} onChange={(event) => onUpdateSection(section.id, { sectionTitle: event.target.value })} />
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
                {openSectionStyleId === section.id ? (
                  <StylePanel value={section.style} onChange={(next) => onUpdateSection(section.id, { sectionStyle: next })} />
                ) : null}
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
                          <Button
                            size="small"
                            icon={<BgColorsOutlined />}
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenBlockStyleId((current) => (current === block.id ? null : block.id))
                            }}
                          />
                          <Button size="small" onClick={(event) => { event.stopPropagation(); onEditBlock(block.id) }}>Cấu hình</Button>
                          <Button size="small" danger onClick={(event) => { event.stopPropagation(); onRemoveBlock(block.id) }}>Xoá</Button>
                        </Space>
                      </Flex>
                      {openBlockStyleId === block.id ? (
                        <div style={{ marginTop: 12 }} onClick={(event) => event.stopPropagation()}>
                          <StylePanel value={block.blockStyle} onChange={(next) => onUpdateBlock(block.id, { blockStyle: next })} />
                        </div>
                      ) : null}
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
