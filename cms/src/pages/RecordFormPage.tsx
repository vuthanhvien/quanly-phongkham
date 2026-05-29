import { Card } from "antd"
import { useNavigate, useParams } from "react-router-dom"
import { RecordFormContent } from "../components/RecordFormContent"
import { ServiceOrderForm } from "../components/ServiceOrderForm"

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
