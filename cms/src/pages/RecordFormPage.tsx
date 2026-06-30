import { Card } from "antd"
import { useNavigate, useParams } from "react-router-dom"
import { RecordFormContent } from "../components/RecordFormContent"
import { ServiceOrderForm } from "../components/ServiceOrderForm"
import { StockBatchForm } from "../components/StockBatchForm"

export function RecordFormPage() {
  const { resource = "customers", id } = useParams()
  const navigate = useNavigate()

  return (
    <Card className="form-card">
      {resource === "service-orders" ? (
        <ServiceOrderForm
          id={id}
          onCancel={() => navigate(`/${resource}`)}
          onSuccess={() => navigate(`/${resource}`)}
        />
      ) : resource === "stock-batches" && !id ? (
        <StockBatchForm
          onCancel={() => navigate(`/${resource}`)}
          onSuccess={() => navigate(`/${resource}`)}
        />
      ) : (
        <RecordFormContent
          id={id}
          resource={resource}
          onCancel={() => navigate(`/${resource}`)}
          onSuccess={() => navigate(`/${resource}`)}
        />
      )}
    </Card>
  )
}
