import { Card, Table, Typography } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"

export function AuditPage() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    api.get("/audit-logs").then((response) => setRows(response.data.data))
  }, [])
  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Security trail</Typography.Text>
          <Typography.Title level={2}>Audit log</Typography.Title>
        </div>
      </div>
      <Card className="table-card">
        <Table
          rowKey="id"
          dataSource={rows}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Thời gian", dataIndex: "createdAt" },
            { title: "Người dùng", dataIndex: "userName" },
            { title: "Hành động", dataIndex: "action" },
            { title: "Phân hệ", dataIndex: "module" },
            { title: "Bản ghi", dataIndex: "targetId" },
          ]}
        />
      </Card>
    </>
  )
}
