import { useDelete } from "@refinedev/core"
import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Tabs,
  Tooltip,
  message,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import { ReactNode, useCallback, useEffect, useState } from "react"
import dayjs from "dayjs"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CmsBackButton } from "../components/CmsBackButton"
import {
  ArrowLeftOutlined,
  AuditOutlined,
  BankOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  PhoneOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SwapOutlined,
  TagOutlined,
  TeamOutlined,
} from "@ant-design/icons"
import { api } from "../api"
import { resolveFileUrl } from "../api"
import { CMS_DATA_REFRESH_EVENT, type CmsDataRefreshDetail } from "../utils/dataRefresh"
import { printHtmlInPlace } from "../utils/printHtml"
import { hasActionAccess, hasResourceAccess } from "../access"
import { isModuleEnabled } from "../company-types"
import { useAppUi } from "../app-ui"
import { RecordFormContent } from "../components/RecordFormContent"
import { FileUploadPanel } from "../components/FileUploadPanel"
import { RecordValueView } from "../components/RecordValueView"
import { ServiceOrderForm } from "../components/ServiceOrderForm"
import { ProductForm } from "../components/ProductForm"
import { ProjectManagementCard } from "../components/ProjectManagementCard"
import { ProtectedFieldRevealModal, type ProtectedFieldRevealTarget } from "../components/ProtectedFieldRevealModal"
import { CustomField, entityLabels, getFieldLabel } from "../models"
import { FileLookupMap, hasFileField, loadFileLookupMap, loadRelationOptions, LookupMap, resolveRecordFieldValue } from "../relations"
import {
  FieldLayoutConfig,
  getFieldCatalog,
  groupFieldsByTab,
  getStoredUserRole,
  getVisibleFieldConfigs,
  ViewSettingRecord,
} from "../view-settings"

interface RelatedBlock {
  title: string
  resource: string
  relationField: string
  rows: Record<string, unknown>[]
  tableFields: FieldLayoutConfig[]
  detailFields: FieldLayoutConfig[]
  printTemplateId?: string
}

interface RelatedRecordDrawerState {
  block: RelatedBlock
  record: Record<string, any> | null
}

interface RelatedRecordEditState {
  block: RelatedBlock
  recordId: string
}

interface MainRecordEditState {
  resource: string
  recordId: string
}

interface RecordHistoryItem {
  key: string
  block: RelatedBlock
  record: Record<string, any>
  occurredAt: dayjs.Dayjs
  dateLabel: string
  timeLabel: string
  title: string
  description?: string
  status?: string
  amount?: string
  imageValue?: unknown
}

interface RecordHistoryGroup {
  key: string
  label: string
  items: RecordHistoryItem[]
  days: RecordHistoryDayGroup[]
}

interface RecordHistoryDayGroup {
  key: string
  label: string
  items: RecordHistoryItem[]
}

interface RecordDetailPageProps {
  resource?: string
  id?: string
  embedded?: boolean
  onClose?: () => void
  refreshKey?: number
}

export function RecordDetailPage(props: RecordDetailPageProps = {}) {
  const params = useParams()
  const resource = props.resource ?? params.resource ?? "customers"
  const id = props.id ?? params.id ?? ""
  const embedded = Boolean(props.embedded)
  const refreshKey = props.refreshKey || 0
  const [chatbotRefreshKey, setChatbotRefreshKey] = useState(0)
  const navigate = useNavigate()
  const { settings } = useAppUi()
  const [toast, toastContextHolder] = message.useMessage()
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const [related, setRelated] = useState<RelatedBlock[]>([])
  const [fields, setFields] = useState<FieldLayoutConfig[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [fileLookups, setFileLookups] = useState<FileLookupMap>({})
  const [loading, setLoading] = useState(true)
  const [relatedDetail, setRelatedDetail] = useState<RelatedRecordDrawerState | null>(null)
  const [relatedDetailLoading, setRelatedDetailLoading] = useState(false)
  const [relatedEdit, setRelatedEdit] = useState<RelatedRecordEditState | null>(null)
  const [mainEdit, setMainEdit] = useState<MainRecordEditState | null>(null)
  const [quickCreateBlock, setQuickCreateBlock] = useState<RelatedBlock | null>(null)
  const [protectedFieldTarget, setProtectedFieldTarget] = useState<ProtectedFieldRevealTarget | null>(null)
  const [revealedValues, setRevealedValues] = useState<Record<string, unknown>>({})
  const { mutate: deleteRecord } = useDelete()
  const canShowRelatedResource = useCallback((relatedResource: string) =>
    isModuleEnabled(
      relatedResource,
      settings.enabledModules,
      settings.companyType || "clinic",
      settings.hasCustomModuleSelection,
    ) && hasResourceAccess(relatedResource),
  [settings.companyType, settings.enabledModules, settings.hasCustomModuleSelection])

  function renderDetailValue(field: FieldLayoutConfig, source: Record<string, any> | null) {
    const value = Object.prototype.hasOwnProperty.call(revealedValues, field.key)
      ? revealedValues[field.key]
      : resolveRecordFieldValue(source, field)
    if ((!field.requiresPasswordToReveal && !field.maskLastThreeDigits) || Object.prototype.hasOwnProperty.call(revealedValues, field.key)) {
      return <RecordValueView field={field} fileLookups={fileLookups} lookups={lookups} value={value} />
    }
    return (
      <Space size={8}>
        <RecordValueView field={field} fileLookups={fileLookups} lookups={lookups} value={value} />
        <Button icon={<EyeOutlined />} size="small" onClick={() => {
          setProtectedFieldTarget({ resource, recordId: id, fieldKey: field.key, label: field.label })
        }}>
          Xem
        </Button>
      </Space>
    )
  }

  const protectedFieldRevealModal = (
    <ProtectedFieldRevealModal
      target={protectedFieldTarget}
      onClose={() => setProtectedFieldTarget(null)}
      onRevealed={(target, value) => setRevealedValues((current) => ({ ...current, [target.fieldKey]: value }))}
    />
  )

  useEffect(() => {
    const onDataRefresh = (event: Event) => {
      const targetResource = (event as CustomEvent<CmsDataRefreshDetail>).detail?.resource
      if (targetResource && targetResource !== resource) return
      setChatbotRefreshKey((value) => value + 1)
    }
    window.addEventListener(CMS_DATA_REFRESH_EVENT, onDataRefresh)
    return () => window.removeEventListener(CMS_DATA_REFRESH_EVENT, onDataRefresh)
  }, [resource])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const activeRole = getStoredUserRole()
    Promise.all([
      api.get(`/records/${resource}/${id}`, { params: { include: '*' } }),
      loadRelated(resource, id, activeRole, canShowRelatedResource),
      api.get("/settings/custom-fields", { params: { entityType: resource } }),
      api.get("/settings/views", { params: { entityType: resource } }),
    ]).then(([recordResponse, relatedResponse, fieldResponse, viewResponse]) => {
      if (!mounted) return
      const nextRecord = recordResponse.data.data
      const customFields = fieldResponse.data.data.filter(
        (field: CustomField) => field.isActive,
      )
      const catalog = getFieldCatalog(resource, customFields)
      Object.keys(nextRecord?.customFields || {}).forEach((key) => {
        if (catalog.some((field) => field.key === key)) return
        catalog.push({ key, label: key })
      })
      const detailFields = getVisibleFieldConfigs(
        catalog,
        viewResponse.data.data as ViewSettingRecord[],
        "DETAIL",
        getStoredUserRole(),
      )

      setRecord(nextRecord)
      setRelated(relatedResponse)
      setFields(detailFields)
      const visibleFields = [
        ...detailFields,
        ...relatedResponse.flatMap((block) => [...block.tableFields, ...block.detailFields]),
      ]
      const fileLookupRequest = hasFileField(visibleFields) ? loadFileLookupMap() : Promise.resolve({})
      const relationLookupRequest = loadRelationOptions(visibleFields)
      Promise.all([fileLookupRequest, relationLookupRequest]).then(([nextFileLookups, nextLookups]) => {
        if (!mounted) return
        setLookups(nextLookups)
        setFileLookups(nextFileLookups)
        setLoading(false)
      })
    })
    return () => {
      mounted = false
    }
  }, [resource, id, canShowRelatedResource, refreshKey, chatbotRefreshKey])

  if (!record && !loading) {
    return <Empty description="Không tìm thấy bản ghi" />
  }

  if (embedded) {
    const detailTabs = groupFieldsByTab(fields).map((group) => ({
      key: group.key,
      label: group.tab || "Thông tin",
      children: (
        <div className="detail-grid">
          <Row gutter={[16, 16]}>
            {group.fields.map((field) => field.layoutType === "title" ? (
              <Col key={field.key} span={24}><Typography.Title level={4} style={{ margin: "8px 0 0", color: field.titleColor, fontSize: ({ sm: 16, md: 20, lg: 24 } as const)[field.titleSize || "md"] }}>{field.label}</Typography.Title>{field.description ? <Typography.Text type="secondary">{field.description}</Typography.Text> : null}</Col>
            ) : (
              <Col key={field.key} xs={24} md={detailWidthToSpan(field.width)}>
                <div className="detail-item">
                  <div className="detail-item-label">
                    {field.description ? (
                      <Space direction="vertical" size={0}>
                        <span>{field.label}</span>
                        <Typography.Text type="secondary">{field.description}</Typography.Text>
                      </Space>
                    ) : field.label}
                  </div>
                  <div className="detail-item-content">
                    {renderDetailValue(field, record)}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      ),
    }))

    return (
      <>
      <Card className="glass-card detail-card" loading={loading}>
        {detailTabs.length > 1 ? (
          <Tabs items={detailTabs} />
        ) : (
          <>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              Thông tin chính
            </Typography.Title>
            {detailTabs[0]?.children}
          </>
        )}
      </Card>
      {protectedFieldRevealModal}
      </>
    )
  }

  return (
    <>
      {toastContextHolder}
      {!embedded && (
        <div className="page-header detail-page-header">
          <div className="detail-page-title-wrap">
            <CmsBackButton to={`/${resource}`} />
            <Typography.Title level={3}>
              {detailTitle(resource, record)}
            </Typography.Title>
          </div>
          <Space>
            <Tooltip title="Làm mới dữ liệu">
              <Button
                aria-label="Làm mới dữ liệu"
                className="detail-header-ghost-button"
                icon={<ReloadOutlined />}
                type="text"
                onClick={() => {
                  void reloadCurrentRecord()
                  void reloadRelatedBlocks()
                }}
              />
            </Tooltip>
            {["customers", "staff"].includes(resource) && related.some((block) => hasActionAccess(block.resource, "create")) && (
              <Dropdown
                menu={{
                  items: related
                    .filter((block) => hasActionAccess(block.resource, "create"))
                    .map((block) => ({
                      key: block.resource,
                      icon: getCustomerHistoryIcon(block.resource),
                      label: entityLabels[block.resource] || block.title,
                      onClick: () => setQuickCreateBlock(block),
                    })),
                }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Button className="primary-glow" icon={<PlusOutlined />} type="primary">
                  Thêm nhanh
                </Button>
              </Dropdown>
            )}
            {resource === "leads" && !record?.convertedCustomerId && hasActionAccess(resource, "convert-to-customer") && (
              <Tooltip title="Chuyển khách tiềm năng thành khách hàng">
                <Button
                  onClick={async () => {
                    const response = await convertLead(id)
                    message.success("Đã chuyển khách tiềm năng thành khách hàng")
                    navigate(`/customers?detail=${response.data.data.id}`)
                  }}
                >
                  Chuyển thành khách hàng
                </Button>
              </Tooltip>
            )}
            {["invoices", "expenses", "payrolls"].includes(resource) && hasActionAccess(resource, "generate-accounting-voucher") && (
              <Tooltip title="Tạo chứng từ kế toán">
                <Button
                  onClick={async () => {
                    await generateAccountingVoucher(resource, id)
                    message.success("Đã tạo chứng từ kế toán")
                  }}
                >
                  Tạo chứng từ kế toán
                </Button>
              </Tooltip>
            )}
            {resource === "accounting-vouchers" && record?.status !== "POSTED" && hasActionAccess(resource, "post") && (
              <Tooltip title="Ghi sổ chứng từ">
                <Button
                  icon={<AuditOutlined />}
                  onClick={async () => {
                    await postAccountingVoucher(id)
                    message.success("Đã ghi sổ chứng từ")
                    await reloadCurrentRecord()
                  }}
                >
                  Ghi sổ
                </Button>
              </Tooltip>
            )}
            {resource === "accounting-vouchers" && record?.status === "POSTED" && hasActionAccess(resource, "unpost") && (
              <Tooltip title="Bỏ ghi sổ chứng từ">
                <Button
                  onClick={async () => {
                    await unpostAccountingVoucher(id)
                    message.success("Đã bỏ ghi sổ chứng từ")
                    await reloadCurrentRecord()
                  }}
                >
                  Bỏ ghi sổ
                </Button>
              </Tooltip>
            )}
            {hasActionAccess(resource, "update") && (
              <Button
                className="primary-glow"
                icon={<EditOutlined />}
                type="primary"
                onClick={() => setMainEdit({ resource, recordId: id })}
              >
                Sửa hồ sơ
              </Button>
            )}
          </Space>
        </div>
      )}

      <Row gutter={[18, 18]} align="stretch" className="detail-split-row">
        {/* Left: related tabs */}
        <Col xs={24} xl={18} className="detail-tabs-col">
          {(() => {
            const serviceOrderItemsTab = resource === "service-orders"
              ? [{
                  key: "__service-order-items",
                  label: "Sản phẩm trong đơn",
                  children: (
                    <Table
                      columns={[
                        { title: "Sản phẩm", dataIndex: "itemName", key: "itemName" },
                        { title: "Số lượng", dataIndex: "quantity", key: "quantity", width: 120, align: "right" },
                        { title: "Đơn giá", dataIndex: "unitPrice", key: "unitPrice", width: 140, align: "right" },
                        { title: "Thành tiền", dataIndex: "lineTotal", key: "lineTotal", width: 160, align: "right" },
                      ]}
                      dataSource={Array.isArray(record?.items) ? record.items : []}
                      pagination={false}
                      rowKey={(item, index) => item.id || `${item.productId || "product"}-${index}`}
                      scroll={{ x: "max-content" }}
                      size="small"
                    />
                  ),
                }]
              : []
            const accountingVoucherLinesTab = resource === "accounting-vouchers" && Array.isArray(record?.lines) && record.lines.length > 0
              ? [{
                  key: "__accounting-voucher-lines",
                  label: "Dòng hạch toán",
                  children: (
                    <Table
                      columns={[
                        {
                          title: "Tài khoản",
                          dataIndex: "accountId",
                          key: "accountId",
                          width: 220,
                          render: (value: unknown) => (
                            <RecordValueView
                              compact
                              field="accountId"
                              fileLookups={fileLookups}
                              lookups={lookups}
                              value={value}
                            />
                          ),
                        },
                        { title: "Nợ", dataIndex: "debitAmount", key: "debitAmount", width: 140 },
                        { title: "Có", dataIndex: "creditAmount", key: "creditAmount", width: 140 },
                        { title: "Diễn giải", dataIndex: "lineDescription", key: "lineDescription" },
                      ]}
                      dataSource={record.lines}
                      pagination={false}
                      rowKey="id"
                      scroll={{ x: "max-content" }}
                      size="small"
                    />
                  ),
                }]
              : []

            const infoTabs = groupFieldsByTab(fields).map((group) => ({
              key: group.key,
              label: group.tab || "Thông tin",
              children: (
                <div className="detail-grid">
                  <Row gutter={[16, 16]}>
                    {group.fields.map((field) => field.layoutType === "title" ? (
                      <Col key={field.key} span={24}><Typography.Title level={4} style={{ margin: "8px 0 0", color: field.titleColor, fontSize: ({ sm: 16, md: 20, lg: 24 } as const)[field.titleSize || "md"] }}>{field.label}</Typography.Title>{field.description ? <Typography.Text type="secondary">{field.description}</Typography.Text> : null}</Col>
                    ) : (
                      <Col key={field.key} xs={24} md={detailWidthToSpan(field.width)}>
                        <div className="detail-item">
                          <div className="detail-item-label">
                            {field.description ? (
                              <Space direction="vertical" size={0}>
                                <span>{field.label}</span>
                                <Typography.Text type="secondary">{field.description}</Typography.Text>
                              </Space>
                            ) : field.label}
                          </div>
                          <div className="detail-item-content">
                            {renderDetailValue(field, record)}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            }))

            const relatedTabs = related.map((block) => ({
              key: block.resource,
              label: (
                <span>
                  {block.title}
                  {block.rows.length > 0 && (
                    <span className="tab-count">{block.rows.length}</span>
                  )}
                </span>
              ),
              children: (
                <div>
                  {hasActionAccess(block.resource, "create") && (
                    <div className="related-tab-toolbar">
                      <Button size="small" type="primary" onClick={() => setQuickCreateBlock(block)}>
                        Thêm nhanh
                      </Button>
                    </div>
                  )}
                  <Table
                    columns={[
                      ...block.tableFields.map((field) => ({
                        title: field.label,
                        dataIndex: field.key,
                        key: field.key,
                        width: field.tableWidth,
                        render: (_: unknown, row: Record<string, any>) => {
                          const value = (
                            <RecordValueView compact field={field} fileLookups={fileLookups} lookups={lookups} value={resolveRecordFieldValue(row, field)} />
                          )
                          const opensDetail = ["code", "name", "fullName", "title"].includes(field.key)
                            && hasActionAccess(block.resource, "view")
                          return opensDetail ? (
                            <Typography.Link onClick={() => void openRelatedDetail(block, String(row.id))}>
                              {value}
                            </Typography.Link>
                          ) : value
                        },
                      })),
                      {
                        title: "",
                        key: "action",
                        fixed: "right" as const,
                        width: 140,
                        render: (_: unknown, row: any) => (
                          <Space size={2}>
                            {hasActionAccess(block.resource, "view") && (
                              <Tooltip title="Xem nhanh">
                                <Button
                                  icon={<EyeOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={() => void openRelatedDetail(block, row.id)}
                                />
                              </Tooltip>
                            )}
                            {hasActionAccess(block.resource, "update") && (
                              <Tooltip title="Chỉnh sửa">
                                <Button
                                  icon={<EditOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={() => setRelatedEdit({ block, recordId: String(row.id) })}
                                />
                              </Tooltip>
                            )}
                            {block.resource === "leads" && !row.convertedCustomerId && hasActionAccess(block.resource, "convert-to-customer") && (
                              <Tooltip title="Chuyển thành khách hàng">
                                <Button
                                  icon={<SwapOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={() => void convertRelatedLead(row.id)}
                                />
                              </Tooltip>
                            )}
                            {block.printTemplateId && hasActionAccess(block.resource, "print") && (
                              <Tooltip title="In biểu mẫu">
                                <Button
                                  icon={<PrinterOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={() => void printRecord(block.printTemplateId!, row.id)}
                                />
                              </Tooltip>
                            )}
                            {hasActionAccess(block.resource, "delete") && (
                              <Popconfirm
                                title="Lưu trữ bản ghi này? Bản ghi chỉ bị ẩn trên giao diện này, không bị xóa khỏi cơ sở dữ liệu."
                                onConfirm={() =>
                                  deleteRecord(
                                    { resource: block.resource, id: row.id },
                                    {
                                      onSuccess: () => {
                                        message.success("Đã lưu trữ")
                                        if (relatedDetail?.record?.id === row.id) {
                                          setRelatedDetail(null)
                                        }
                                        void reloadRelatedBlocks()
                                      },
                                    },
                                  )
                                }
                              >
                                <Tooltip title="Lưu trữ bản ghi">
                                  <Button danger icon={<DeleteOutlined />} size="small" type="text" />
                                </Tooltip>
                              </Popconfirm>
                            )}
                          </Space>
                        ),
                      },
                    ]}
                    dataSource={block.rows}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: "max-content" }}
                    size="small"
                  />
                </div>
              ),
            }))

            const recordHistoryGroups = ["customers", "staff"].includes(resource) ? buildRecordHistoryGroups(related) : []
            const recordHistoryCount = recordHistoryGroups.reduce((total, group) => total + group.items.length, 0)
            const recordHistoryTab = ["customers", "staff"].includes(resource)
              ? [{
                  key: "__record-history",
                  label: (
                    <span>
                      <HistoryOutlined /> Lịch sử
                      {recordHistoryCount > 0 && <span className="tab-count">{recordHistoryCount}</span>}
                    </span>
                  ),
                  children: (
                    <RecordHistoryTimeline
                      groups={recordHistoryGroups}
                      onOpen={(block, recordId) => void openRelatedDetail(block, recordId)}
                    />
                  ),
                }]
              : []

            const allTabs = [...infoTabs, ...recordHistoryTab, ...accountingVoucherLinesTab, ...relatedTabs, ...serviceOrderItemsTab]
            if (allTabs.length === 0) {
              return <Card className="glass-card detail-card" loading={loading}><Empty description="Không có dữ liệu liên kết" /></Card>
            }
            return (
              <Card className="glass-card detail-card detail-tabs-card" loading={loading}>
                <Tabs items={allTabs} />
              </Card>
            )
          })()}
        </Col>

        {/* Right: detail info */}
        <Col xs={24} xl={6}>
          <div className="detail-right-stack">
            <Card className="glass-card detail-card profile-account-card detail-side-card" loading={loading}>
              <div className="detail-side-header">
                <div className="profile-account-copy">
                  <Typography.Text className="eyebrow">Thông tin chính</Typography.Text>
                  <Typography.Title level={4} style={{ margin: "4px 0 2px" }}>
                    {getSummaryTitle(resource)}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {detailTitle(resource, record)}
                  </Typography.Text>
                </div>
              </div>

              {getSummaryTags(resource, record).length > 0 ? (
                <Space size={[8, 8]} wrap>
                  {getSummaryTags(resource, record).map((tag) => (
                    <Tag key={`${tag.label}-${tag.value}`} className="soft-tag">
                      {tag.value}
                    </Tag>
                  ))}
                </Space>
              ) : null}

              <div className="profile-link-list">
                {buildDetailSummaryItems(resource, record, lookups, fileLookups).map((item) => (
                  <div key={item.key} className="profile-link-item">
                    {item.icon}
                    <div>
                      <Typography.Text type="secondary">{item.label}</Typography.Text>
                      <div className="profile-link-value">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            {resource === "projects" && record ? (
              <ProjectManagementCard
                canEdit={hasActionAccess(resource, "update")}
                project={{ ...record, id }}
                onSaved={reloadCurrentRecord}
              />
            ) : null}
          </div>
        </Col>
      </Row>

      <Modal
        destroyOnHidden
        maskClosable={false}
        open={Boolean(relatedDetail || relatedDetailLoading)}
        title={relatedDetail ? `${relatedDetail.block.title} - chi tiết` : "Đang tải chi tiết"}
        width={720}
        footer={null}
        onCancel={() => {
          setRelatedDetail(null)
          setRelatedDetailLoading(false)
        }}
      >
        {relatedDetail && (
          <div className="detail-grid">
            <Row gutter={[16, 16]}>
              {relatedDetail.block.detailFields.map((field) => field.layoutType === "title" ? (
                <Col key={field.key} span={24}><Typography.Title level={4} style={{ margin: "8px 0 0", color: field.titleColor, fontSize: ({ sm: 16, md: 20, lg: 24 } as const)[field.titleSize || "md"] }}>{field.label}</Typography.Title>{field.description ? <Typography.Text type="secondary">{field.description}</Typography.Text> : null}</Col>
              ) : (
                <Col key={field.key} xs={24} md={detailWidthToSpan(field.width)}>
                  <div className="detail-item">
                    <div className="detail-item-label">
                      {field.description ? (
                        <Space direction="vertical" size={0}>
                          <span>{field.label}</span>
                          <Typography.Text type="secondary">{field.description}</Typography.Text>
                        </Space>
                      ) : (
                        field.label
                      )}
                    </div>
                    <div className="detail-item-content">
                      <RecordValueView field={field} fileLookups={fileLookups} lookups={lookups} value={resolveRecordFieldValue(relatedDetail.record, field)} />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>

      <Modal
        destroyOnHidden
        maskClosable={false}
        open={Boolean(quickCreateBlock)}
        title={quickCreateBlock ? `Thêm nhanh ${entityLabels[quickCreateBlock.resource] || quickCreateBlock.resource}` : "Thêm nhanh"}
        width={quickCreateBlock?.resource === "service-orders" ? 980 : 620}
        footer={null}
        onCancel={() => setQuickCreateBlock(null)}
      >
        {quickCreateBlock && (
          quickCreateBlock.resource === "service-orders" ? (
            <ServiceOrderForm
              compact
              initialValues={{ [quickCreateBlock.relationField]: id }}
              notifyOnSuccess={false}
              onCancel={() => setQuickCreateBlock(null)}
              onSuccess={() => {
                setQuickCreateBlock(null)
                toast.success("Đã lưu đơn hàng")
                void reloadRelatedBlocks()
              }}
            />
          ) : quickCreateBlock.resource === "files" ? (
            <FileUploadPanel
              extraPayload={{ [quickCreateBlock.relationField]: id }}
              onCancel={() => setQuickCreateBlock(null)}
              onSuccess={() => {
                setQuickCreateBlock(null)
                toast.success("Đã upload tài liệu")
                void reloadRelatedBlocks()
              }}
            />
          ) : (
            <RecordFormContent
              compact
              initialValues={{ [quickCreateBlock.relationField]: id }}
              resource={quickCreateBlock.resource}
              notifyOnSuccess={false}
              onCancel={() => setQuickCreateBlock(null)}
              onSuccess={() => {
                setQuickCreateBlock(null)
                toast.success("Đã lưu dữ liệu")
                void reloadRelatedBlocks()
              }}
            />
          )
        )}
      </Modal>

      <Modal
        destroyOnHidden
        maskClosable={false}
        open={Boolean(mainEdit)}
        title={mainEdit ? `Chỉnh sửa ${entityLabels[mainEdit.resource] || mainEdit.resource}` : "Chỉnh sửa"}
        width={mainEdit?.resource === "service-orders" ? 980 : 620}
        footer={null}
        onCancel={() => setMainEdit(null)}
      >
        {mainEdit && (
          mainEdit.resource === "service-orders" ? (
            <ServiceOrderForm
              compact
              id={mainEdit.recordId}
              onCancel={() => setMainEdit(null)}
              onSuccess={async () => {
                setMainEdit(null)
                await reloadCurrentRecord()
                await reloadRelatedBlocks()
              }}
            />
          ) : mainEdit.resource === "products" ? (
            <ProductForm compact id={mainEdit.recordId} onCancel={() => setMainEdit(null)} onSuccess={async () => { setMainEdit(null); await reloadCurrentRecord(); await reloadRelatedBlocks() }} />
          ) : (
            <RecordFormContent
              compact
              id={mainEdit.recordId}
              resource={mainEdit.resource}
              onCancel={() => setMainEdit(null)}
              onSuccess={async () => {
                setMainEdit(null)
                await reloadCurrentRecord()
                await reloadRelatedBlocks()
              }}
            />
          )
        )}
      </Modal>

      <Modal
        destroyOnHidden
        maskClosable={false}
        open={Boolean(relatedEdit)}
        title={relatedEdit ? `Chỉnh sửa ${entityLabels[relatedEdit.block.resource] || relatedEdit.block.resource}` : "Chỉnh sửa"}
        width={relatedEdit?.block.resource === "service-orders" ? 980 : 620}
        footer={null}
        onCancel={() => setRelatedEdit(null)}
      >
        {relatedEdit && (
          relatedEdit.block.resource === "service-orders" ? (
            <ServiceOrderForm
              compact
              id={relatedEdit.recordId}
              onCancel={() => setRelatedEdit(null)}
              onSuccess={() => {
                setRelatedEdit(null)
                void reloadRelatedBlocks()
                if (relatedDetail?.record?.id === relatedEdit.recordId) {
                  void openRelatedDetail(relatedEdit.block, relatedEdit.recordId)
                }
              }}
            />
          ) : relatedEdit.block.resource === "products" ? (
            <ProductForm compact id={relatedEdit.recordId} onCancel={() => setRelatedEdit(null)} onSuccess={() => { setRelatedEdit(null); void reloadRelatedBlocks(); if (relatedDetail?.record?.id === relatedEdit.recordId) void openRelatedDetail(relatedEdit.block, relatedEdit.recordId) }} />
          ) : (
            <RecordFormContent
              compact
              id={relatedEdit.recordId}
              resource={relatedEdit.block.resource}
              onCancel={() => setRelatedEdit(null)}
              onSuccess={() => {
                setRelatedEdit(null)
                void reloadRelatedBlocks()
                if (relatedDetail?.record?.id === relatedEdit.recordId) {
                  void openRelatedDetail(relatedEdit.block, relatedEdit.recordId)
                }
              }}
            />
          )
        )}
      </Modal>
      {protectedFieldRevealModal}
    </>
  )

  async function openRelatedDetail(block: RelatedBlock, recordId: string) {
    setRelatedDetailLoading(true)
    try {
      const response = await api.get(`/records/${block.resource}/${recordId}`, { params: { include: '*' } })
      setRelatedDetail({ block, record: response.data.data })
    } finally {
      setRelatedDetailLoading(false)
    }
  }

  async function reloadRelatedBlocks() {
    const activeRole = getStoredUserRole()
    const nextRelated = await loadRelated(resource, id, activeRole, canShowRelatedResource)
    setRelated(nextRelated)
    setLookups({})
    const visibleFields = [
      ...fields,
      ...nextRelated.flatMap((block) => [...block.tableFields, ...block.detailFields]),
    ]
    if (hasFileField(visibleFields)) {
      setFileLookups(await loadFileLookupMap())
    } else {
      setFileLookups({})
    }
  }

  async function reloadCurrentRecord() {
    const response = await api.get(`/records/${resource}/${id}`, { params: { include: '*' } })
    setRecord(response.data.data)
  }

  async function convertRelatedLead(recordId: string) {
    const response = await convertLead(recordId)
    message.success("Đã chuyển khách tiềm năng thành khách hàng")
    await reloadRelatedBlocks()
    navigate(`/customers/${response.data.data.id}`)
  }
}

function detailWidthToSpan(width?: FieldLayoutConfig["width"]) {
  switch (width) {
    case "25":
      return 6
    case "33":
      return 8
    case "50":
      return 12
    case "66":
      return 16
    case "75":
      return 18
    case "100":
    default:
      return 24
  }
}

async function loadRelated(
  resource: string,
  id: string,
  role: string,
  canShowResource: (resource: string) => boolean,
): Promise<RelatedBlock[]> {
  if (resource === "leads") {
    const specs = [
      {
        title: "Nhật ký chăm sóc khách tiềm năng",
        resource: "lead-activities",
        field: "leadId",
      },
    ]
    return loadBlocks(specs, id, role, canShowResource)
  }
  if (resource === "customers") {
    const specs = [
      {
        title: "Lịch hẹn liên quan",
        resource: "appointments",
        field: "customerId",
      },
      {
        title: "Hồ sơ bệnh án",
        resource: "medical-episodes",
        field: "customerId",
      },
      {
        title: "Liệu trình",
        resource: "treatments",
        field: "customerId",
      },
      {
        title: "Thăm khám",
        resource: "consultations",
        field: "customerId",
      },
      {
        title: "Đơn hàng / dịch vụ sử dụng",
        resource: "service-orders",
        field: "customerId",
      },
      {
        title: "Hình ảnh - chẩn đoán",
        resource: "customer-images",
        field: "customerId",
      },
      {
        title: "Phiếu thu / hóa đơn",
        resource: "invoices",
        field: "customerId",
      },
    ]
    return loadBlocks(specs, id, role, canShowResource)
  }
  if (resource === "staff") {
    const specs = [
      {
        title: "Hợp đồng lao động",
        resource: "work-contracts",
        field: "staffId",
      },
      {
        title: "Bảo hiểm",
        resource: "staff-insurances",
        field: "staffId",
      },
      {
        title: "Chấm công",
        resource: "attendances",
        field: "staffId",
      },
      {
        title: "Nghỉ phép",
        resource: "leave-requests",
        field: "staffId",
      },
      {
        title: "Đổi giờ chấm công",
        resource: "attendance-adjustment-requests",
        field: "staffId",
      },
      {
        title: "Đơn công tác",
        resource: "business-trip-requests",
        field: "staffId",
      },
      {
        title: "Xin thanh toán",
        resource: "payment-requests",
        field: "staffId",
      },
      {
        title: "Bảng lương",
        resource: "payrolls",
        field: "staffId",
      },
      {
        title: "Lịch làm việc",
        resource: "work-schedules",
        field: "staffId",
      },
      {
        title: "Khen thưởng & Kỷ luật",
        resource: "staff-rewards",
        field: "staffId",
      },
      {
        title: "Đào tạo & Chứng chỉ",
        resource: "staff-trainings",
        field: "staffId",
      },
      {
        title: "Đánh giá hiệu suất",
        resource: "performance-reviews",
        field: "staffId",
      },
      {
        title: "Lịch sử thăng tiến",
        resource: "position-histories",
        field: "staffId",
      },
      {
        title: "Quyền theo chi nhánh",
        resource: "branch-role-assignments",
        field: "staffId",
      },
      {
        title: "Tài khoản đăng nhập",
        resource: "user-accounts",
        field: "staffId",
      },
      {
        title: "Tài liệu đính kèm",
        resource: "files",
        field: "staffId",
      },
      {
        title: "Hoa hồng",
        resource: "commissions",
        field: "staffName",
      },
    ]
    return loadBlocks(specs, id, role, canShowResource)
  }
  return []
}

async function loadBlocks(
  specs: Array<{
    title: string
    resource: string
    field: string
  }>,
  id: string,
  role: string,
  canShowResource: (resource: string) => boolean,
) {
  const responses = await Promise.all(
    specs.map(async (spec) => {
      // Luôn dùng đúng điều kiện của menu, để tab liên kết không trở thành
      // lối truy cập vòng qua cấu hình module và role hiện tại.
      if (!canShowResource(spec.resource)) return null

      const [recordResponse, fieldResponse, viewResponse, printResponse] = await Promise.all([
        api
          .get(`/records/${spec.resource}`, {
            params: {
              pageSize: 500,
              include: '*',
              advanced: JSON.stringify([{ field: spec.field, operator: "eq", value: id }]),
            },
          })
          .catch(() => ({ data: { data: [] } })),
        api
          .get("/settings/custom-fields", { params: { entityType: spec.resource } })
          .catch(() => ({ data: { data: [] } })),
        api
          .get("/settings/views", { params: { entityType: spec.resource } })
          .catch(() => ({ data: { data: [] } })),
        api
          .get("/settings/print-templates", { params: { entityType: spec.resource } })
          .catch(() => ({ data: { data: [] } })),
      ])

      const rows = recordResponse.data.data.filter(
        (row: Record<string, unknown>) => String(row[spec.field]) === id,
      )
      const customFields = fieldResponse.data.data.filter(
        (field: CustomField) => field.isActive,
      )
      const catalog = getFieldCatalog(spec.resource, customFields)
      rows.forEach((row: Record<string, any>) => {
        Object.keys(row.customFields || {}).forEach((key) => {
          if (catalog.some((field) => field.key === key)) return
          catalog.push({ key, label: key })
        })
      })
      const views = viewResponse.data.data as ViewSettingRecord[]

      return {
        rows,
        tableFields: getVisibleFieldConfigs(catalog, views, "TABLE", role),
        detailFields: getVisibleFieldConfigs(catalog, views, "DETAIL", role),
        printTemplateId: printResponse.data.data?.[0]?.id,
      }
    }),
  )
  return responses.flatMap((response, index) => response ? [{
    title: specs[index].title,
    resource: specs[index].resource,
    relationField: specs[index].field,
    rows: response.rows,
    tableFields: response.tableFields,
    detailFields: response.detailFields,
    printTemplateId: response.printTemplateId,
  }] : [])
}

function RecordHistoryTimeline({
  groups,
  onOpen,
}: {
  groups: RecordHistoryGroup[]
  onOpen: (block: RelatedBlock, recordId: string) => void
}) {
  if (!groups.length) {
    return (
      <Empty
        className="customer-history-empty"
        description="Chưa có lịch sử liên quan"
      />
    )
  }

  return (
    <div className="customer-history-timeline">
      {groups.map((group) => (
        <section className="customer-history-month" key={group.key}>
          <div className="customer-history-month-title">{group.label}</div>
          <div className="customer-history-day-list">
            {group.days.map((day) => (
              <section className="customer-history-day" key={day.key}>
                <div className="customer-history-day-marker">
                  <span>{day.label}</span>
                </div>
                <div className="customer-history-card-grid">
                  {day.items.map((item) => (
                    <article className={`customer-history-item${item.imageValue ? " has-image" : ""}`} key={item.key}>
                      <button
                        className="customer-history-card"
                        type="button"
                        onClick={() => onOpen(item.block, String(item.record.id))}
                      >
                        {item.imageValue ? (
                          <>
                            <div className="customer-history-card-icon">
                              {getCustomerHistoryIcon(item.block.resource)}
                              <span>{item.block.title}</span>
                            </div>
                            <div className="customer-history-image">
                              {renderCustomerHistoryImage(item.imageValue, item.title)}
                            </div>
                          </>
                        ) : (
                          <div className="customer-history-card-icon">
                            {getCustomerHistoryIcon(item.block.resource)}
                            <span>{item.block.title}</span>
                          </div>
                        )}
                        <div className="customer-history-card-body">
                          <div className="customer-history-card-head">
                            {item.timeLabel ? <span className="customer-history-date">{item.timeLabel}</span> : null}
                          </div>
                          <div className="customer-history-title">{item.title}</div>
                          {item.description ? (
                            <div className="customer-history-description">{item.description}</div>
                          ) : null}
                          <div className="customer-history-meta">
                            {item.status ? <Tag className="soft-tag">{item.status}</Tag> : null}
                            {item.amount ? <Tag color="green">{item.amount}</Tag> : null}
                            {item.record.code ? <Tag>{String(item.record.code)}</Tag> : null}
                          </div>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

async function convertLead(id: string) {
  return api.post(`/records/leads/${id}/convert-to-customer`)
}

async function generateAccountingVoucher(resource: string, id: string) {
  return api.post(`/records/${resource}/${id}/generate-accounting-voucher`)
}

async function postAccountingVoucher(id: string) {
  return api.post(`/records/accounting-vouchers/${id}/post`)
}

async function unpostAccountingVoucher(id: string) {
  return api.post(`/records/accounting-vouchers/${id}/unpost`)
}

async function printRecord(templateId: string, recordId: string) {
  const html = (
    await api.get(`/settings/print-templates/${templateId}/render/${recordId}`, {
      responseType: "text",
    })
  ).data
  printHtmlInPlace(html, "Mẫu in")
}

function detailTitle(resource: string, record: Record<string, any> | null) {
  if (!record) return entityLabels[resource] || resource
  return (
    record.fullName ||
    record.name ||
    record.code ||
    record.email ||
    entityLabels[resource] ||
    resource
  )
}

function getSummaryTitle(resource: string) {
  const label = entityLabels[resource] || resource
  return `Tóm tắt ${String(label).toLowerCase()}`
}

function getSummaryStatusLabel(resource: string, record: Record<string, any> | null) {
  const rawValue = String(record?.status || record?.role || "ACTIVE")
  const label = getFieldLabel(resource, "status", rawValue)
  if (label !== rawValue) return label
  return rawValue
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSummaryTags(resource: string, record: Record<string, any> | null) {
  if (!record) return []

  const tags: Array<{ label: string; value: string }> = []
  const statusLabel = getSummaryStatusLabel(resource, record)
  if (statusLabel && statusLabel !== "-") {
    tags.push({ label: "status", value: statusLabel })
  }

  if (record.code) {
    tags.push({ label: "code", value: String(record.code) })
  }

  return tags.slice(0, 2)
}

type DetailSummaryItem = {
  key: string
  icon: ReactNode
  label: string
  value: ReactNode
}

function buildDetailSummaryItems(
  resource: string,
  record: Record<string, any> | null,
  lookups: LookupMap,
  fileLookups: FileLookupMap,
): DetailSummaryItem[] {
  if (!record) return []

  const catalog = getFieldCatalog(resource, [])
  const fieldMap = new Map(catalog.map((field) => [field.key, field]))
  const items: DetailSummaryItem[] = []
  const added = new Set<string>()

  const pushItem = (key: string, icon: ReactNode, fallbackLabel?: string) => {
    if (added.has(key)) return
    const value = record[key]
    if (value === null || value === undefined || value === "") return
    const field = fieldMap.get(key)
    items.push({
      key,
      icon,
      label: field?.label || fallbackLabel || key,
      value: (
        <RecordValueView
          compact
          field={field || key}
          fileLookups={fileLookups}
          lookups={lookups}
          value={value}
        />
      ),
    })
    added.add(key)
  }

  if (resource === "customers") {
    pushItem("status", <AuditOutlined />)
    pushItem("tier", <TagOutlined />, "Hạng khách")
    pushItem("totalSpent", <BankOutlined />)
    pushItem("phone", <PhoneOutlined />)
    pushItem("email", <IdcardOutlined />)
    return items
  }

  if (resource === "staff") {
    pushItem("status", <AuditOutlined />)
    pushItem("type", <TagOutlined />, "Loại nhân sự")
    pushItem("position", <IdcardOutlined />, "Chức danh")
    pushItem("departmentId", <TeamOutlined />, "Phòng ban")
    pushItem("phone", <PhoneOutlined />)
    pushItem("email", <IdcardOutlined />)
    return items
  }

  const candidateFields: Array<[string, ReactNode, string?]> = [
    ["status", <AuditOutlined />],
    ["code", <TagOutlined />],
    ["name", <FileTextOutlined />],
    ["fullName", <FileTextOutlined />],
    ["customerId", <TeamOutlined />, "Khách hàng"],
    ["leadId", <TeamOutlined />, "Khách tiềm năng"],
    ["staffId", <TeamOutlined />, "Nhân viên"],
    ["doctorStaffId", <TeamOutlined />, "Bác sĩ"],
    ["assignedStaffId", <TeamOutlined />, "Phụ trách"],
    ["ownerStaffId", <TeamOutlined />, "Người phụ trách"],
    ["departmentId", <TeamOutlined />, "Phòng ban"],
    ["branchId", <BankOutlined />, "Chi nhánh"],
    ["totalAmount", <BankOutlined />, "Tổng tiền"],
    ["paidAmount", <BankOutlined />, "Đã thanh toán"],
    ["amount", <BankOutlined />, "Giá trị"],
    ["orderDate", <CalendarOutlined />, "Ngày"],
    ["workDate", <CalendarOutlined />, "Ngày làm"],
    ["date", <CalendarOutlined />, "Ngày"],
    ["startDate", <CalendarOutlined />, "Từ ngày"],
    ["startTime", <CalendarOutlined />, "Bắt đầu"],
    ["createdAt", <CalendarOutlined />, "Ngày tạo"],
  ]

  candidateFields.forEach(([key, icon, fallbackLabel]) => pushItem(key, icon, fallbackLabel))

  if (!items.length) {
    pushItem("note", <FileTextOutlined />, "Ghi chú")
  }

  return items.slice(0, 6)
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ")
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function formatCurrencyValue(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return formatValue(value)
  return `${new Intl.NumberFormat("vi-VN").format(numeric)} đ`
}

const CUSTOMER_HISTORY_DATE_FIELDS: Record<string, string[]> = {
  appointments: ["startTime", "endTime", "createdAt"],
  "medical-episodes": ["operationDate", "createdAt", "updatedAt"],
  treatments: ["updatedAt", "createdAt"],
  consultations: ["consultedAt", "createdAt"],
  "service-orders": ["orderDate", "createdAt"],
  "customer-images": ["capturedAt", "createdAt"],
  invoices: ["createdAt", "updatedAt"],
  "work-contracts": ["startDate", "signedDate", "createdAt"],
  "staff-insurances": ["startDate", "createdAt"],
  attendances: ["date", "createdAt"],
  "leave-requests": ["startDate", "createdAt"],
  "attendance-adjustment-requests": ["date", "createdAt"],
  "business-trip-requests": ["startDate", "createdAt"],
  "payment-requests": ["requestDate", "createdAt"],
  payrolls: ["periodStart", "createdAt"],
  "work-schedules": ["workDate", "startTime", "createdAt"],
  "staff-rewards": ["issuedAt", "createdAt"],
  "staff-trainings": ["completedAt", "startDate", "createdAt"],
  "performance-reviews": ["reviewDate", "createdAt"],
  "position-histories": ["effectiveDate", "createdAt"],
  "branch-role-assignments": ["createdAt", "updatedAt"],
  "user-accounts": ["createdAt", "updatedAt"],
  files: ["createdAt", "updatedAt"],
  commissions: ["createdAt", "updatedAt"],
}

function buildRecordHistoryGroups(relatedBlocks: RelatedBlock[]): RecordHistoryGroup[] {
  const items = relatedBlocks
    .flatMap((block) => block.rows.map((row) => buildRecordHistoryItem(block, row)))
    .filter((item): item is RecordHistoryItem => Boolean(item))
    .sort((a, b) => b.occurredAt.valueOf() - a.occurredAt.valueOf())

  const groups = new Map<string, RecordHistoryGroup>()
  items.forEach((item) => {
    const key = item.occurredAt.format("YYYY-MM")
    const group = groups.get(key) || {
      key,
      label: formatHistoryMonth(item.occurredAt),
      items: [],
      days: [],
    }
    group.items.push(item)
    groups.set(key, group)
  })
  return Array.from(groups.values()).map((group) => ({
    ...group,
    days: buildRecordHistoryDayGroups(group.items),
  }))
}

function buildRecordHistoryDayGroups(items: RecordHistoryItem[]): RecordHistoryDayGroup[] {
  const groups = new Map<string, RecordHistoryDayGroup>()
  items.forEach((item) => {
    const key = item.occurredAt.format("YYYY-MM-DD")
    const group = groups.get(key) || {
      key,
      label: formatHistoryDay(item.occurredAt),
      items: [],
    }
    group.items.push(item)
    groups.set(key, group)
  })
  return Array.from(groups.values())
}

function buildRecordHistoryItem(block: RelatedBlock, row: Record<string, any>): RecordHistoryItem | null {
  const occurredAt = getCustomerHistoryDate(block.resource, row)
  if (!occurredAt) return null

  return {
    key: `${block.resource}-${row.id || occurredAt.valueOf()}`,
    block,
    record: row,
    occurredAt,
    dateLabel: occurredAt.format("DD/MM/YYYY"),
    timeLabel: occurredAt.format("HH:mm") === "00:00" ? "" : occurredAt.format("HH:mm"),
    title: getCustomerHistoryTitle(block.resource, row),
    description: getCustomerHistoryDescription(block.resource, row),
    status: row.status ? getFieldLabel(block.resource, "status", String(row.status)) : undefined,
    amount: getCustomerHistoryAmount(block.resource, row),
    imageValue: block.resource === "customer-images" ? row.imageUrl : undefined,
  }
}

function getCustomerHistoryDate(resource: string, row: Record<string, any>) {
  const candidateFields = CUSTOMER_HISTORY_DATE_FIELDS[resource] || ["createdAt", "updatedAt"]
  for (const field of candidateFields) {
    const value = row[field]
    if (!value) continue
    const date = dayjs(value)
    if (date.isValid()) return date
  }
  return null
}

function getCustomerHistoryTitle(resource: string, row: Record<string, any>) {
  if (resource === "appointments") {
    return `Lịch hẹn ${getFieldLabel(resource, "type", String(row.type || "CONSULTATION")).toLowerCase()}`
  }
  if (resource === "medical-episodes") return String(row.serviceName || row.diagnosis || "Hồ sơ bệnh án")
  if (resource === "treatments") return String(row.name || "Liệu trình")
  if (resource === "consultations") return String(row.summary || row.diagnosis || "Thăm khám")
  if (resource === "service-orders") return String(row.serviceName || row.code || "Đơn hàng / dịch vụ")
  if (resource === "customer-images") return String(row.title || getFieldLabel(resource, "mediaType", String(row.mediaType || "BEFORE")))
  if (resource === "invoices") return String(row.code || row.invoiceNumber || "Phiếu thu / hóa đơn")
  if (resource === "work-contracts") return String(row.contractNumber || row.code || "Hợp đồng lao động")
  if (resource === "staff-insurances") return String(row.insuranceNumber || row.insuranceType || "Bảo hiểm")
  if (resource === "attendances") return `Chấm công ${row.checkIn ? `vào ${row.checkIn}` : ""}`.trim()
  if (resource === "leave-requests") return String(row.leaveType ? `Nghỉ phép ${getFieldLabel(resource, "leaveType", String(row.leaveType)).toLowerCase()}` : "Nghỉ phép")
  if (resource === "attendance-adjustment-requests") return "Đổi giờ chấm công"
  if (resource === "business-trip-requests") return String(row.destination || "Đơn công tác")
  if (resource === "payment-requests") return String(row.title || row.reason || "Xin thanh toán")
  if (resource === "payrolls") return String(row.period || row.code || "Bảng lương")
  if (resource === "work-schedules") return String(row.shiftLabel || "Lịch làm việc")
  if (resource === "staff-rewards") return String(row.title || row.rewardType || "Khen thưởng & Kỷ luật")
  if (resource === "staff-trainings") return String(row.title || row.courseName || "Đào tạo & Chứng chỉ")
  if (resource === "performance-reviews") return String(row.title || row.reviewPeriod || "Đánh giá hiệu suất")
  if (resource === "position-histories") return String(row.position || row.title || "Lịch sử thăng tiến")
  if (resource === "branch-role-assignments") return "Quyền theo chi nhánh"
  if (resource === "user-accounts") return String(row.email || row.username || "Tài khoản đăng nhập")
  if (resource === "files") return String(row.title || row.originalName || "Tài liệu đính kèm")
  if (resource === "commissions") return String(row.title || row.code || "Hoa hồng")
  return String(row.title || row.name || row.code || entityLabels[resource] || resource)
}

function getCustomerHistoryDescription(resource: string, row: Record<string, any>) {
  const fieldsByResource: Record<string, string[]> = {
    appointments: ["note"],
    "medical-episodes": ["chiefComplaint", "diagnosis", "allergyWarning"],
    treatments: ["note"],
    consultations: ["diagnosis", "nextAction", "summary"],
    "service-orders": ["note"],
    "customer-images": ["diagnosisNote"],
    invoices: ["method"],
    "work-contracts": ["contractType", "note"],
    "staff-insurances": ["provider", "note"],
    attendances: ["checkOut", "note"],
    "leave-requests": ["reason", "note"],
    "attendance-adjustment-requests": ["reason", "note"],
    "business-trip-requests": ["purpose", "note"],
    "payment-requests": ["reason", "description", "note"],
    payrolls: ["note"],
    "work-schedules": ["note"],
    "staff-rewards": ["description", "note"],
    "staff-trainings": ["provider", "description", "note"],
    "performance-reviews": ["summary", "note"],
    "position-histories": ["departmentName", "note"],
    "branch-role-assignments": ["roleName", "note"],
    "user-accounts": ["role", "status"],
    files: ["originalName", "note"],
    commissions: ["note"],
  }
  for (const field of fieldsByResource[resource] || ["note", "description"]) {
    const value = row[field]
    if (value === null || value === undefined || value === "") continue
    const text = String(value)
    return text.length > 72 ? `${text.slice(0, 72)}...` : text
  }
  return undefined
}

function getCustomerHistoryAmount(resource: string, row: Record<string, any>) {
  if (!["service-orders", "invoices", "payment-requests", "payrolls", "commissions"].includes(resource)) return undefined
  const value = row.totalAmount || row.paidAmount || row.amount || row.netSalary || row.commissionAmount
  if (value === null || value === undefined || value === "") return undefined
  return formatCurrencyValue(value)
}

function formatHistoryMonth(date: dayjs.Dayjs) {
  return `Tháng ${date.format("M")} ${date.format("YYYY")}`
}

function formatHistoryDay(date: dayjs.Dayjs) {
  return date.format("DD/MM")
}

function renderCustomerHistoryImage(value: unknown, alt: string) {
  const source = Array.isArray(value) ? value[0] : value
  if (!source) return null
  return <img alt={alt} src={resolveFileUrl(String(source))} />
}

function getCustomerHistoryIcon(resource: string) {
  if (resource === "appointments") return <CalendarOutlined />
  if (resource === "consultations" || resource === "medical-episodes") return <AuditOutlined />
  if (resource === "service-orders" || resource === "invoices") return <BankOutlined />
  if (resource === "customer-images") return <FileTextOutlined />
  if (["attendances", "leave-requests", "work-schedules", "business-trip-requests"].includes(resource)) return <CalendarOutlined />
  if (["payment-requests", "payrolls", "commissions"].includes(resource)) return <BankOutlined />
  if (["work-contracts", "staff-insurances", "position-histories", "user-accounts", "branch-role-assignments"].includes(resource)) return <IdcardOutlined />
  if (resource === "files") return <FileTextOutlined />
  if (["staff-rewards", "staff-trainings", "performance-reviews"].includes(resource)) return <AuditOutlined />
  return <HistoryOutlined />
}
