import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Flex, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Typography } from 'antd'
import { createContext, useContext } from 'react'
import { ImagePickerInput } from '../../components/ImagePickerInput'
import type { LandingBlock, LandingFormField, LandingSlide } from '../../models'
import type { BlockComposerState, LandingSectionDraft } from './editor-helpers'

export type BlockComposerModalContextValue = {
  open: boolean
  saving: boolean
  composer: BlockComposerState | null
  sections: LandingSectionDraft[]
  blockTypeOptions: Array<{ value: LandingBlock['type']; label: string }>
  onCancel: () => void
  onSave: () => void
  onChangeType: (type: LandingBlock['type']) => void
  onUpdateBlock: (patch: Partial<LandingBlock>) => void
  onAddSlide: () => void
  onUpdateSlide: (slideId: string, patch: Partial<LandingSlide>) => void
  onRemoveSlide: (slideId: string) => void
  onAddField: () => void
  onUpdateField: (fieldId: string, patch: Partial<LandingFormField>) => void
  onRemoveField: (fieldId: string) => void
  slugify: (value: string) => string
}

const BlockComposerModalContext = createContext<BlockComposerModalContextValue | null>(null)

export function BlockComposerProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: BlockComposerModalContextValue
}) {
  return <BlockComposerModalContext.Provider value={value}>{children}</BlockComposerModalContext.Provider>
}

export function useBlockComposerModal() {
  const context = useContext(BlockComposerModalContext)
  if (!context) {
    throw new Error('useBlockComposerModal must be used within BlockComposerProvider')
  }
  return context
}

export function BlockComposerModal() {
  const {
    open,
    saving,
    composer,
    sections,
    blockTypeOptions,
    onCancel,
    onSave,
    onChangeType,
    onUpdateBlock,
    onAddSlide,
    onUpdateSlide,
    onRemoveSlide,
    onAddField,
    onUpdateField,
    onRemoveField,
    slugify,
  } = useBlockComposerModal()

  return (
    <Modal title="Thêm block vào section" open={open} onCancel={onCancel} onOk={onSave} okText="Lưu block" confirmLoading={saving} width={760}>
      {composer ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Section hiện tại" style={{ marginBottom: 0 }}>
                <Input value={sections.find((item) => item.id === composer.sectionId)?.title || `Khu vực ${sections.find((item) => item.id === composer.sectionId)?.order || ''}`} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Loại block" style={{ marginBottom: 0 }}>
                <Select value={composer.block.type} onChange={onChangeType} options={blockTypeOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Hàng" style={{ marginBottom: 0 }}>
                <InputNumber min={1} value={composer.block.row} onChange={(value) => onUpdateBlock({ row: Number(value || 1) })} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Span/12" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={12} value={composer.block.span} onChange={(value) => onUpdateBlock({ span: Number(value || 12) })} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Canh lề" style={{ marginBottom: 0 }}>
                <Select value={composer.block.align || 'left'} onChange={(value) => onUpdateBlock({ align: value })} disabled={!['title', 'text'].includes(composer.block.type)} options={[{ value: 'left', label: 'Trái' }, { value: 'center', label: 'Giữa' }, { value: 'right', label: 'Phải' }]} />
              </Form.Item>
            </Col>
          </Row>

          {composer.block.type === 'title' ? (
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item label="Tiêu đề" style={{ marginBottom: 0 }}>
                  <Input value={composer.block.title} onChange={(event) => onUpdateBlock({ title: event.target.value })} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Cấp heading" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} max={6} value={composer.block.level || 2} onChange={(value) => onUpdateBlock({ level: Number(value || 2) })} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          ) : null}

          {composer.block.type === 'text' ? (
            <Form.Item label="Nội dung" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={5} value={composer.block.text} onChange={(event) => onUpdateBlock({ text: event.target.value })} />
            </Form.Item>
          ) : null}

          {composer.block.type === 'image' ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Form.Item label="URL hình ảnh" style={{ marginBottom: 0 }}>
                <ImagePickerInput value={composer.block.url} onChange={(url) => onUpdateBlock({ url })} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Alt ảnh" style={{ marginBottom: 0 }}>
                    <Input value={composer.block.alt} onChange={(event) => onUpdateBlock({ alt: event.target.value })} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Chú thích" style={{ marginBottom: 0 }}>
                    <Input value={composer.block.caption} onChange={(event) => onUpdateBlock({ caption: event.target.value })} />
                  </Form.Item>
                </Col>
              </Row>
            </Space>
          ) : null}

          {composer.block.type === 'video' ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Form.Item label="URL video" style={{ marginBottom: 0 }}>
                <Input value={composer.block.url} onChange={(event) => onUpdateBlock({ url: event.target.value })} placeholder="https://youtu.be/..." />
              </Form.Item>
              <Form.Item label="Tiêu đề" style={{ marginBottom: 0 }}>
                <Input value={composer.block.title} onChange={(event) => onUpdateBlock({ title: event.target.value })} />
              </Form.Item>
            </Space>
          ) : null}

          {composer.block.type === 'slider' ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Form.Item label="Tiêu đề slider" style={{ marginBottom: 0 }}>
                <Input value={composer.block.title} onChange={(event) => onUpdateBlock({ title: event.target.value })} />
              </Form.Item>
              <Flex justify="space-between" align="center">
                <Typography.Text strong>Danh sách slide</Typography.Text>
                <Button size="small" icon={<PlusOutlined />} onClick={onAddSlide}>Thêm slide</Button>
              </Flex>
              {(composer.block.slides || []).map((slide) => (
                <Card key={slide.id} size="small">
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Form.Item label="URL hình ảnh" style={{ marginBottom: 0 }}>
                      <ImagePickerInput value={slide.url} onChange={(url) => onUpdateSlide(slide.id, { url })} />
                    </Form.Item>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item label="Alt ảnh" style={{ marginBottom: 0 }}>
                          <Input value={slide.alt} onChange={(event) => onUpdateSlide(slide.id, { alt: event.target.value })} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Chú thích" style={{ marginBottom: 0 }}>
                          <Input value={slide.caption} onChange={(event) => onUpdateSlide(slide.id, { caption: event.target.value })} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button size="small" danger onClick={() => onRemoveSlide(slide.id)}>Xoá slide</Button>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : null}

          {composer.block.type === 'form' ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Tiêu đề form" style={{ marginBottom: 0 }}>
                    <Input value={composer.block.title} onChange={(event) => onUpdateBlock({ title: event.target.value })} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Nhãn nút gửi" style={{ marginBottom: 0 }}>
                    <Input value={composer.block.submitLabel} onChange={(event) => onUpdateBlock({ submitLabel: event.target.value })} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Mô tả" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={3} value={composer.block.description} onChange={(event) => onUpdateBlock({ description: event.target.value })} />
              </Form.Item>
              <Form.Item label="Thông báo thành công" style={{ marginBottom: 0 }}>
                <Input value={composer.block.successMessage} onChange={(event) => onUpdateBlock({ successMessage: event.target.value })} />
              </Form.Item>
              <Flex justify="space-between" align="center">
                <Typography.Text strong>Trường nhập liệu</Typography.Text>
                <Button size="small" icon={<PlusOutlined />} onClick={onAddField}>Thêm trường</Button>
              </Flex>
              {(composer.block.fields || []).map((field) => (
                <Card key={field.id} size="small">
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="Nhãn" style={{ marginBottom: 8 }}>
                        <Input value={field.label} onChange={(event) => onUpdateField(field.id, { label: event.target.value })} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Tên key" style={{ marginBottom: 8 }}>
                        <Input value={field.name} onChange={(event) => onUpdateField(field.id, { name: slugify(event.target.value).replace(/-/g, '_') })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Loại" style={{ marginBottom: 8 }}>
                        <Select value={field.type} onChange={(value) => onUpdateField(field.id, { type: value })} options={[{ value: 'text', label: 'Văn bản' }, { value: 'textarea', label: 'Đoạn văn' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Điện thoại' }, { value: 'number', label: 'Số' }]} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Độ rộng cột" style={{ marginBottom: 8 }}>
                        <InputNumber min={1} max={12} value={field.span} onChange={(value) => onUpdateField(field.id, { span: Number(value || 12) })} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Bắt buộc" style={{ marginBottom: 8 }}>
                        <Switch checked={field.required} onChange={(checked) => onUpdateField(field.id, { required: checked })} />
                      </Form.Item>
                    </Col>
                    <Col span={18}>
                      <Form.Item label="Gợi ý nhập" style={{ marginBottom: 0 }}>
                        <Input value={field.placeholder} onChange={(event) => onUpdateField(field.id, { placeholder: event.target.value })} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label=" " style={{ marginBottom: 0 }}>
                        <Button size="small" danger block onClick={() => onRemoveField(field.id)}>Xoá</Button>
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          ) : null}
        </Space>
      ) : null}
    </Modal>
  )
}
