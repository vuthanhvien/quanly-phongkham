import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Flex, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Typography } from 'antd'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { ImagePickerInput } from '../../components/ImagePickerInput'
import { ModalTitleBar } from '../../components/ModalTitleBar'
import type { LandingBlock, LandingContentItem, LandingFormField, LandingSlide } from '../../models'
import type { BlockComposerState, LandingSectionDraft } from './editor-helpers'

export type BlockComposerModalContextValue = {
  open: boolean
  saving: boolean
  composer: BlockComposerState | null
  sections: LandingSectionDraft[]
  blockTypeOptions: Array<{ value: LandingBlock['type']; label: string }>
  landingForms: Array<{ id: string; name: string; title: string; targetResource: string }>
  onCancel: () => void
  onSave: () => void
  onChangeType: (type: LandingBlock['type']) => void
  onUpdateBlock: (patch: Partial<LandingBlock>) => void
  onAddSlide: () => void
  onUpdateSlide: (slideId: string, patch: Partial<LandingSlide>) => void
  onRemoveSlide: (slideId: string) => void
  onAddItem: () => void
  onUpdateItem: (itemId: string, patch: Partial<LandingContentItem>) => void
  onRemoveItem: (itemId: string) => void
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
    landingForms,
    onCancel,
    onSave,
    onChangeType,
    onUpdateBlock,
    onAddSlide,
    onUpdateSlide,
    onRemoveSlide,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
    onAddField,
    onUpdateField,
    onRemoveField,
    slugify,
  } = useBlockComposerModal()

  const isEditMode = composer?.mode === 'edit'
  const [fullscreenPopup, setFullscreenPopup] = useState(false)
  const [contentRecords, setContentRecords] = useState<Array<Record<string, unknown>>>([])
  const contentResource = composer?.block.type === 'posts' ? 'posts' : composer?.block.type === 'news' ? 'news' : null
  const selectedContentIds = useMemo(
    () => (composer?.block.items || []).map((item) => item.id).filter((id) => contentRecords.some((record) => String(record.id) === id)),
    [composer?.block.items, contentRecords],
  )

  useEffect(() => {
    let active = true
    async function loadContentRecords() {
      if (!contentResource) {
        setContentRecords([])
        return
      }
      try {
        const response = await api.get(`/records/${contentResource}`, { params: { pageSize: 200, status: 'PUBLISHED' } })
        if (!active) return
        setContentRecords(response.data?.data || [])
      } catch {
        if (!active) return
        setContentRecords([])
      }
    }
    void loadContentRecords()
    return () => {
      active = false
    }
  }, [contentResource])

  useEffect(() => {
    if (!open) setFullscreenPopup(false)
  }, [open])

  function mapContentRecord(record: Record<string, unknown>): LandingContentItem {
    const slug = String(record.slug || '')
    return {
      id: String(record.id),
      title: String(record.title || ''),
      label: String(record.category || ''),
      description: String(record.excerpt || ''),
      url: typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
      date: String(record.publishedAt || '').slice(0, 10),
      href: slug ? `/${slug}` : undefined,
    }
  }

  return (
    <Modal
      className={`quick-drawer${fullscreenPopup ? " quick-drawer-fullscreen" : ""}`}
      title={
        <ModalTitleBar
          fullscreen={fullscreenPopup}
          title={isEditMode ? 'Cấu hình block' : 'Thêm block vào section'}
          onToggleFullscreen={() => setFullscreenPopup((current) => !current)}
        />
      }
      open={open}
      onCancel={() => {
        setFullscreenPopup(false)
        onCancel()
      }}
      onOk={onSave}
      okText={isEditMode ? 'Cập nhật block' : 'Lưu block'}
      confirmLoading={saving}
      width={fullscreenPopup ? "calc(100vw - 24px)" : 760}
    >
      {composer ? (
        <Form layout="vertical" size="small">
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
              <Row gutter={12}>
                <Col span={14}><Form.Item label="Tiêu đề slider" style={{ marginBottom: 0 }}><Input value={composer.block.title} onChange={(event) => onUpdateBlock({ title: event.target.value })} /></Form.Item></Col>
                <Col span={10}><Form.Item label="Kiểu hiển thị" style={{ marginBottom: 0 }}><Select value={composer.block.sliderVariant || 'carousel'} onChange={(sliderVariant) => onUpdateBlock({ sliderVariant })} options={[{ value: 'carousel', label: 'Toàn khung' }, { value: 'cards', label: 'Thẻ ảnh' }, { value: 'feature', label: 'Nổi bật' }]} /></Form.Item></Col>
              </Row>
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

          {['gallery', 'posts', 'news'].includes(composer.block.type) ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Row gutter={12}>
                <Col span={composer.block.type === 'gallery' ? 12 : 24}><Form.Item label="Tiêu đề block" style={{ marginBottom: 0 }}><Input value={composer.block.title} onChange={(event) => onUpdateBlock({ title: event.target.value })} /></Form.Item></Col>
                {composer.block.type === 'gallery' ? <Col span={12}><Form.Item label="Bố cục ảnh" style={{ marginBottom: 0 }}><Select value={composer.block.galleryLayout || 'mosaic'} onChange={(galleryLayout) => onUpdateBlock({ galleryLayout })} options={[{ value: 'grid', label: 'Lưới đều' }, { value: 'mosaic', label: 'Xếp hình' }, { value: 'editorial', label: 'Tạp chí' }]} /></Form.Item></Col> : null}
              </Row>
              <Form.Item label="Mô tả" style={{ marginBottom: 0 }}><Input.TextArea rows={2} value={composer.block.description} onChange={(event) => onUpdateBlock({ description: event.target.value })} /></Form.Item>
              {contentResource ? (
                <Form.Item label={`Lấy từ ${contentResource === 'posts' ? 'Posts' : 'News'} trong DB`} style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    mode="multiple"
                    optionFilterProp="label"
                    options={contentRecords.map((record) => ({
                      value: String(record.id),
                      label: `${record.title || 'Không tiêu đề'}${record.category ? ` - ${record.category}` : ''}`,
                    }))}
                    placeholder="Chọn bài đã đăng"
                    value={selectedContentIds}
                    onChange={(ids) => {
                      const selectedRecords = ids
                        .map((id) => contentRecords.find((record) => String(record.id) === id))
                        .filter(Boolean) as Array<Record<string, unknown>>
                      onUpdateBlock({ items: selectedRecords.map(mapContentRecord) })
                    }}
                  />
                </Form.Item>
              ) : null}
              <Flex align="center" justify="space-between"><Typography.Text strong>{composer.block.type === 'gallery' ? 'Ảnh trong gallery' : 'Danh sách nội dung'}</Typography.Text><Button icon={<PlusOutlined />} size="small" onClick={onAddItem}>Thêm mục</Button></Flex>
              {(composer.block.items || []).map((item) => (
                <Card key={item.id} size="small">
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <Form.Item label="Ảnh đại diện" style={{ marginBottom: 0 }}><ImagePickerInput value={item.url} onChange={(url) => onUpdateItem(item.id, { url })} /></Form.Item>
                    <Row gutter={12}>
                      <Col span={12}><Form.Item label={composer.block.type === 'gallery' ? 'Chú thích' : 'Tiêu đề'} style={{ marginBottom: 0 }}><Input value={composer.block.type === 'gallery' ? item.caption : item.title} onChange={(event) => onUpdateItem(item.id, composer.block.type === 'gallery' ? { caption: event.target.value } : { title: event.target.value })} /></Form.Item></Col>
                      <Col span={12}><Form.Item label={composer.block.type === 'gallery' ? 'Alt ảnh' : 'Nhãn chuyên mục'} style={{ marginBottom: 0 }}><Input value={composer.block.type === 'gallery' ? item.alt : item.label} onChange={(event) => onUpdateItem(item.id, composer.block.type === 'gallery' ? { alt: event.target.value } : { label: event.target.value })} /></Form.Item></Col>
                    </Row>
                    {composer.block.type !== 'gallery' ? <><Row gutter={12}><Col span={12}><Form.Item label="Ngày hiển thị" style={{ marginBottom: 0 }}><Input value={item.date} onChange={(event) => onUpdateItem(item.id, { date: event.target.value })} placeholder="08/07/2026" /></Form.Item></Col><Col span={12}><Form.Item label="Liên kết" style={{ marginBottom: 0 }}><Input value={item.href} onChange={(event) => onUpdateItem(item.id, { href: event.target.value })} /></Form.Item></Col></Row><Form.Item label="Mô tả ngắn" style={{ marginBottom: 0 }}><Input.TextArea rows={2} value={item.description} onChange={(event) => onUpdateItem(item.id, { description: event.target.value })} /></Form.Item></> : null}
                    <Button danger size="small" onClick={() => onRemoveItem(item.id)}>Xoá mục</Button>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : null}

          {composer.block.type === 'form' ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Form.Item label="Biểu mẫu trang đích" extra="Biểu mẫu được tạo trong mục Biểu mẫu trang đích" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="Chọn Landing Form" value={composer.block.formId} options={landingForms.map((form) => ({ value: form.id, label: `${form.title} — ${form.name}` }))} onChange={(formId) => onUpdateBlock({ formId })} />
              </Form.Item>
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
              <Form.Item label="Dữ liệu tạo sau khi khách gửi form" style={{ marginBottom: 0 }}>
                <Select
                  value={composer.block.targetResource || 'leads'}
                  options={[
                    { value: 'leads', label: 'Tạo khách tiềm năng' },
                    { value: 'appointments', label: 'Tạo lịch hẹn' },
                    { value: 'service-orders', label: 'Tạo đơn hàng' },
                  ]}
                  onChange={(targetResource) => onUpdateBlock({ targetResource })}
                />
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
        </Form>
      ) : null}
    </Modal>
  )
}
