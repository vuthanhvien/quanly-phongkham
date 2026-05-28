import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  message,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { CustomField, entityLabels } from "../models"
import { displayValue, loadRelationOptions, LookupMap } from "../relations"
import {
  FieldLayoutConfig,
  getFieldCatalog,
  getStoredUserRole,
  getVisibleFieldConfigs,
  ViewSettingRecord,
} from "../view-settings"

interface RelatedBlock {
  title: string
  resource: string
  rows: Record<string, unknown>[]
  columns: string[]
}

export function RecordDetailPage() {
  const { resource = "customers", id = "" } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const [related, setRelated] = useState<RelatedBlock[]>([])
  const [fields, setFields] = useState<FieldLayoutConfig[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([
      api.get(`/records/${resource}/${id}`),
      loadRelated(resource, id),
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
      loadRelationOptions([
        ...detailFields,
        "branchId",
        "defaultBranchId",
        "customerId",
        "leadId",
        "staffId",
        "assignedStaffId",
        "ownerStaffId",
        "consultantStaffId",
        "doctorStaffId",
        "performerStaffId",
        "userId",
        "invoiceId",
        "convertedCustomerId",
      ]).then((lookupResponse) => {
        if (!mounted) return
        setLookups(lookupResponse)
        setLoading(false)
      })
    })
    return () => {
      mounted = false
    }
  }, [resource, id])

  if (!record && !loading) {
    return <Empty description="Không tìm thấy bản ghi" />
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Hồ sơ chi tiết</Typography.Text>
          <Typography.Title level={2}>
            {detailTitle(resource, record)}
          </Typography.Title>
        </div>
        <Space>
          <Link to={`/${resource}`}>
            <Button>Quay lại</Button>
          </Link>
          {resource === "leads" && !record?.convertedCustomerId && (
            <Button
              onClick={async () => {
                const response = await convertLead(id)
                message.success("Đã chuyển lead thành khách hàng")
                navigate(`/customers/${response.data.data.id}`)
              }}
            >
              Chuyển thành khách hàng
            </Button>
          )}
          <Link to={`/${resource}/${id}/edit`}>
            <Button className="primary-glow" type="primary">
              Sửa hồ sơ
            </Button>
          </Link>
        </Space>
      </div>

      <Row gutter={[18, 18]}>
        <Col
          xs={24}
          xl={resource === "customers" || resource === "staff" ? 15 : 24}
        >
          <Card className="glass-card detail-card" loading={loading}>
            <Typography.Title level={4}>Thông tin chính</Typography.Title>
            <Descriptions column={1} bordered>
              {fields.map((field) => (
                <Descriptions.Item
                  key={field.key}
                  label={
                    field.description ? (
                      <Space direction="vertical" size={0}>
                        <span>{field.label}</span>
                        <Typography.Text type="secondary">
                          {field.description}
                        </Typography.Text>
                      </Space>
                    ) : (
                      field.label
                    )
                  }
                >
                  {displayValue(
                    field,
                    record?.[field.key] ?? record?.customFields?.[field.key],
                    lookups,
                  )}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
        {(resource === "customers" || resource === "staff") && (
          <Col xs={24} xl={9}>
            <Card className="glass-card detail-card" loading={loading}>
              <Typography.Title level={4}>
                {resource === "customers"
                  ? "Tổng quan khách hàng"
                  : "Tổng quan nhân viên"}
              </Typography.Title>
              <div className="profile-summary">
                <div>
                  <Typography.Text type="secondary">Trạng thái</Typography.Text>
                  <Tag className="soft-tag">
                    {record?.status || record?.role || "ACTIVE"}
                  </Tag>
                </div>
                {resource === "customers" && (
                  <>
                    <div>
                      <Typography.Text type="secondary">
                        Hạng khách
                      </Typography.Text>
                      <Typography.Title level={3}>
                        {record?.tier || "MEMBER"}
                      </Typography.Title>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        Tổng chi tiêu
                      </Typography.Text>
                      <Typography.Title level={4}>
                        {formatValue(record?.totalSpent)}
                      </Typography.Title>
                    </div>
                  </>
                )}
                {resource === "staff" && (
                  <>
                    <div>
                      <Typography.Text type="secondary">
                        Chức danh
                      </Typography.Text>
                      <Typography.Title level={4}>
                        {record?.position || "-"}
                      </Typography.Title>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        Chi nhánh mặc định
                      </Typography.Text>
                      <Typography.Text>
                        {displayValue(
                          "defaultBranchId",
                          record?.defaultBranchId,
                          lookups,
                        )}
                      </Typography.Text>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {related.map((block) => (
        <Card
          className="glass-card detail-card"
          key={block.title}
          title={block.title}
        >
          <Table
            columns={[
              ...block.columns.map((key) => ({
                title: key,
                dataIndex: key,
                key,
                render: (value: unknown) => displayValue(key, value, lookups),
              })),
              {
                title: "",
                key: "action",
                render: (_: unknown, row: any) => (
                  <Link to={`/${block.resource}/${row.id}`}>Xem</Link>
                ),
              },
            ]}
            dataSource={block.rows}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Card>
      ))}
    </>
  )
}

async function loadRelated(
  resource: string,
  id: string,
): Promise<RelatedBlock[]> {
  if (resource === "leads") {
    const specs = [
      {
        title: "Nhật ký chăm lead",
        resource: "lead-activities",
        field: "leadId",
        columns: ["activityType", "scheduledAt", "ownerStaffId", "status"],
      },
    ]
    return loadBlocks(specs, id)
  }
  if (resource === "customers") {
    const specs = [
      {
        title: "Lịch hẹn liên quan",
        resource: "appointments",
        field: "customerId",
        columns: ["type", "startTime", "status", "doctorName"],
      },
      {
        title: "Hồ sơ bệnh án",
        resource: "medical-episodes",
        field: "customerId",
        columns: ["serviceName", "doctorName", "status", "operationDate"],
      },
      {
        title: "Liệu trình",
        resource: "treatments",
        field: "customerId",
        columns: ["name", "totalSessions", "completedSessions", "status"],
      },
      {
        title: "Thăm khám",
        resource: "consultations",
        field: "customerId",
        columns: ["consultedAt", "consultantStaffId", "doctorStaffId", "status"],
      },
      {
        title: "Đơn hàng / dịch vụ sử dụng",
        resource: "service-orders",
        field: "customerId",
        columns: ["code", "serviceName", "quantity", "totalAmount", "status"],
      },
      {
        title: "Hình ảnh - chẩn đoán",
        resource: "customer-images",
        field: "customerId",
        columns: ["mediaType", "title", "capturedAt", "diagnosisNote"],
      },
      {
        title: "Phiếu thu / hóa đơn",
        resource: "invoices",
        field: "customerId",
        columns: ["code", "totalAmount", "paidAmount", "status"],
      },
    ]
    return loadBlocks(specs, id)
  }
  if (resource === "staff") {
    const specs = [
      {
        title: "Quyền theo chi nhánh",
        resource: "branch-role-assignments",
        field: "staffId",
        columns: ["branchId", "roleName", "roleKeys"],
      },
      {
        title: "Tài khoản đăng nhập",
        resource: "user-accounts",
        field: "staffId",
        columns: ["email", "role", "branchId", "isActive"],
      },
      {
        title: "Hoa hồng liên quan",
        resource: "commissions",
        field: "staffName",
        columns: ["invoiceId", "roleType", "amount", "status"],
      },
    ]
    return loadBlocks(specs, id)
  }
  return []
}

async function loadBlocks(
  specs: Array<{
    title: string
    resource: string
    field: string
    columns: string[]
  }>,
  id: string,
) {
  const responses = await Promise.all(
    specs.map((spec) =>
      api
        .get(`/records/${spec.resource}`, { params: { pageSize: 100 } })
        .catch(() => ({ data: { data: [] } })),
    ),
  )
  return specs.map((spec, index) => ({
    title: specs[index].title,
    resource: spec.resource,
    columns: spec.columns,
    rows: responses[index].data.data.filter(
      (row: Record<string, unknown>) => String(row[spec.field]) === id,
    ),
  }))
}

async function convertLead(id: string) {
  return api.post(`/records/leads/${id}/convert-to-customer`)
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

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ")
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
