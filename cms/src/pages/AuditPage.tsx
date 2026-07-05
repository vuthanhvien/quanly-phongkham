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
          <Typography.Title level={3}>Nhật ký hệ thống</Typography.Title>
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
