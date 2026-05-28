import { Card } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { RecordFormContent } from '../components/RecordFormContent';

export function RecordFormPage() {
  const { resource = 'customers', id } = useParams();
  const navigate = useNavigate();

  return (
    <Card className="form-card">
      <RecordFormContent
        id={id}
        resource={resource}
        onCancel={() => navigate(`/${resource}`)}
        onSuccess={() => navigate(`/${resource}`)}
      />
    </Card>
  );
}
