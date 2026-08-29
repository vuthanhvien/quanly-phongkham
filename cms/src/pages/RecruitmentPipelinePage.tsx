import { PlusOutlined, ReloadOutlined } from "@ant-design/icons"
import { Button, Card, Empty, Space, Tag, Typography } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"
import { toastError } from "../toast"

const stages = [
  ["NEW", "Mới"], ["SCREENING", "Sàng lọc"], ["INTERVIEW_1", "PV vòng 1"],
  ["SPECIALIST", "Chuyên môn"], ["OFFER", "Đề nghị"], ["HIRED", "Đạt"], ["REJECTED", "Không đạt"],
] as const

export function RecruitmentPipelinePage() {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [applications, setApplications] = useState<any[]>([]); const [candidates, setCandidates] = useState<Record<string, any>>({}); const [positions, setPositions] = useState<Record<string, any>>({})
  const load = async () => { setLoading(true); try { const [apps, people, jobs] = await Promise.all([api.get("/records/candidate-applications", { params: { pageSize: 1000 } }), api.get("/records/candidates", { params: { pageSize: 1000 } }), api.get("/records/recruitment-positions", { params: { pageSize: 500 } })]); setApplications(apps.data.data || []); setCandidates(Object.fromEntries((people.data.data || []).map((x: any) => [x.id, x]))); setPositions(Object.fromEntries((jobs.data.data || []).map((x: any) => [x.id, x])))} catch (error) { toastError(getApiErrorMessage(error, "Không tải được pipeline tuyển dụng")) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const grouped = useMemo(() => Object.fromEntries(stages.map(([key]) => [key, applications.filter((x) => x.stage === key)])), [applications])
  const move = async (application: any, stage: string) => { try { await api.patch(`/records/candidate-applications/${application.id}`, { stage }); setApplications((rows) => rows.map((row) => row.id === application.id ? { ...row, stage } : row)) } catch (error) { toastError(getApiErrorMessage(error, "Không thể cập nhật pipeline")) } }
  return <><div className="page-header"><Typography.Title className="page-title-with-icon" level={3}>Pipeline tuyển dụng</Typography.Title><Space><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Tải lại</Button><Button icon={<PlusOutlined />} type="primary" onClick={() => navigate("/candidate-applications/create")}>Thêm hồ sơ ứng tuyển</Button></Space></div><div className="recruitment-shortcuts"><Button onClick={() => navigate("/recruitment-positions")}>Vị trí tuyển</Button><Button onClick={() => navigate("/candidates")}>Ứng viên</Button><Button onClick={() => navigate("/recruitment-interviews")}>Lịch phỏng vấn</Button><Button onClick={() => navigate("/recruitment-scorecards")}>Scorecard</Button><Button onClick={() => navigate("/recruitment-offers")}>Đề nghị tuyển</Button></div><div className="recruitment-board">{stages.map(([stage, label]) => <section className="recruitment-column" key={stage}><Typography.Text strong>{label} ({grouped[stage]?.length || 0})</Typography.Text>{grouped[stage]?.length ? grouped[stage].map((application: any) => { const candidate = candidates[application.candidateId]; const position = positions[application.recruitmentPositionId]; const nextIndex = stages.findIndex(([key]) => key === stage) + 1; return <Card className="recruitment-card" key={application.id} size="small"><Typography.Text strong>{candidate?.fullName || "Ứng viên"}</Typography.Text><Typography.Paragraph type="secondary">{position?.name || "Chưa xác định vị trí"}</Typography.Paragraph>{application.appliedAt ? <Tag>{application.appliedAt}</Tag> : null}<Space size={4} style={{ marginTop: 8 }}>{nextIndex > 1 ? <Button size="small" onClick={() => void move(application, stages[nextIndex - 2][0])}>←</Button> : null}{nextIndex < stages.length ? <Button size="small" onClick={() => void move(application, stages[nextIndex][0])}>→</Button> : null}</Space></Card> }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />}</section>)}</div></>
}
