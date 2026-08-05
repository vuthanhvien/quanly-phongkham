import { EditOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Space, Tooltip, Typography } from "antd"
import { useMemo, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

export type WorkflowCanvasStep = {
  id: string
  name: string
  stepOrder: number
  stateLabel?: string
  approverType: string
  approverRoleKey?: string
  approveNextStepId?: string
  approveActionLabel?: string
  rejectActionLabel?: string
  boardX?: number
  boardY?: number
  isActive: boolean
  rejectBehavior?: string
  rejectNextStepId?: string
}

type Props = {
  steps: WorkflowCanvasStep[]
  layout?: Record<string, { x?: number; y?: number }>
  viewport?: { x?: number; y?: number; zoom?: number }
  onAddStep?: () => void
  onEditStep?: (step: WorkflowCanvasStep) => void
  onInsertAfterStep?: (step: WorkflowCanvasStep) => void
  onPositionChange?: (step: WorkflowCanvasStep, position: { boardX: number; boardY: number }) => void
  onLayoutChange?: (nodeId: string, position: { x: number; y: number }) => void
  onReorder?: (steps: WorkflowCanvasStep[]) => void
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void
}

type Lane = { id: string; label: string; index: number }

const HEADER_WIDTH = 154
const LANE_HEIGHT = 138
const TASK_WIDTH = 208
const TASK_HEIGHT = 82
const DECISION_SIZE = 92
const STEP_GAP = 360
const START_X = HEADER_WIDTH + 56
const FIRST_STEP_X = HEADER_WIDTH + 270

const nodeTypes: NodeTypes = {
  approvalTask: ApprovalTaskNode,
  decision: DecisionNode,
  startEnd: StartEndNode,
  swimlane: SwimlaneNode,
}

export function WorkflowFlowCanvas({ steps, layout, onAddStep, onEditStep, onInsertAfterStep, onPositionChange, onLayoutChange, onReorder, onViewportChange }: Props) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const ordered = useMemo(() => [...steps].sort((a, b) => Number(a.stepOrder || 0) - Number(b.stepOrder || 0)), [steps])
  const lanes = useMemo(() => buildLanes(ordered), [ordered])
  const laneMap = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane])), [lanes])
  const selectedStep = ordered.find((step) => step.id === selectedStepId)
  const flowKey = useMemo(() => ordered.map((step) => `${step.id}:${step.stepOrder}:${step.approveNextStepId || ""}:${step.rejectNextStepId || ""}`).join("|") || "empty-flow", [ordered])
  const boardHeight = Math.max(lanes.length * LANE_HEIGHT, 640)

  const nodes = useMemo<Node[]>(() => {
    const boardWidth = Math.max(FIRST_STEP_X + ordered.length * STEP_GAP + 460, 1280)
    const laneNodes: Node[] = lanes.map((lane) => ({
      id: `lane-${lane.id}`,
      type: "swimlane",
      position: { x: 0, y: lane.index * LANE_HEIGHT },
      data: { label: lane.label },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
      style: { width: boardWidth, height: LANE_HEIGHT },
    }))

    const startLane = laneMap.get("requester") || lanes[0]
    const systemLane = laneMap.get("system") || lanes[lanes.length - 1]
    const flowNodes: Node[] = [
      {
        id: "__start",
        type: "startEnd",
        position: layoutPosition(layout, "__start", START_X, laneCenter(startLane) - 36),
        data: { label: "START", tone: "start" },
        draggable: true,
        selectable: true,
        zIndex: 2,
      },
      {
        id: "__approved",
        type: "startEnd",
        position: layoutPosition(layout, "__approved", Math.max(FIRST_STEP_X + ordered.length * STEP_GAP + 190, 760), laneCenter(systemLane) - 64),
        data: { label: "APPROVED", tone: "approved" },
        draggable: true,
        selectable: true,
        zIndex: 2,
      },
      {
        id: "__rejected",
        type: "startEnd",
        position: layoutPosition(layout, "__rejected", Math.max(FIRST_STEP_X + ordered.length * STEP_GAP + 190, 760), laneCenter(systemLane) + 16),
        data: { label: "REJECTED", tone: "rejected" },
        draggable: true,
        selectable: true,
        zIndex: 2,
      },
    ]

    ordered.forEach((step, index) => {
      const lane = laneMap.get(stepLaneId(step)) || systemLane
      const savedStepPosition = layoutPosition(layout, step.id, FIRST_STEP_X + index * STEP_GAP, laneCenter(lane) - TASK_HEIGHT / 2)
      const x = Number(step.boardX ?? savedStepPosition.x)
      const y = Number(step.boardY ?? savedStepPosition.y)
      flowNodes.push({
        id: step.id,
        type: "approvalTask",
        position: { x, y },
        data: {
          step,
          selected: selectedStepId === step.id,
          approver: approverLabel(step),
        },
        draggable: true,
        zIndex: 3,
      })
      flowNodes.push({
        id: decisionId(step.id),
        type: "decision",
        position: layoutPosition(layout, decisionId(step.id), x + TASK_WIDTH + 48, laneCenter(lane) - DECISION_SIZE / 2),
        data: {
          label: "Decision",
          approveLabel: step.approveActionLabel || "Approve",
          rejectLabel: step.rejectActionLabel || "Reject",
        },
        draggable: true,
        selectable: true,
        zIndex: 3,
      })
    })

    return [...laneNodes, ...flowNodes]
  }, [laneMap, lanes, layout, ordered, selectedStepId])

  const edges = useMemo<Edge[]>(() => {
    const items: Edge[] = []
    const firstStep = ordered[0]
    if (firstStep) {
      items.push(makeEdge("__start", firstStep.id, "submit", "Gửi duyệt", "neutral"))
    }
    ordered.forEach((step, index) => {
      const hasExplicitTerminal = ["__DONE", "__REJECT"].includes(String(step.approveNextStepId || ""))
      const approveTerminal = step.approveNextStepId === "__REJECT" ? "__rejected" : "__approved"
      const nextStep = hasExplicitTerminal
        ? undefined
        : step.approveNextStepId
          ? ordered.find((item) => item.id === step.approveNextStepId)
          : ordered[index + 1]
      const rejectStep = step.rejectBehavior === "GOTO_STEP" && step.rejectNextStepId
        ? ordered.find((item) => item.id === step.rejectNextStepId)
        : undefined

      items.push(makeEdge(step.id, decisionId(step.id), `task-${step.id}`, "Xử lý", "neutral"))
      items.push(makeEdge(decisionId(step.id), nextStep?.id || approveTerminal, `approve-${step.id}`, step.approveActionLabel || "Approve", "approve", "approve"))
      // Give every rejection its own horizontal routing lane so branches remain legible.
      items.push(makeEdge(
        decisionId(step.id),
        rejectStep?.id || "__rejected",
        `reject-${step.id}`,
        step.rejectActionLabel || "Reject",
        "reject",
        "reject",
        34 + index * 28,
      ))
    })
    return items
  }, [ordered])

  function handleNodeDragStop(_: unknown, node: Node) {
    const step = ordered.find((item) => item.id === node.id)
    if (!step) {
      if (node.id.startsWith("decision-") || node.id.startsWith("__")) {
        onLayoutChange?.(node.id, {
          x: Math.round(node.position.x),
          y: Math.round(node.position.y),
        })
      }
      return
    }
    const lane = laneMap.get(stepLaneId(step))
    const position = {
      boardX: Math.round(node.position.x),
      boardY: Math.round(lane ? laneCenter(lane) - TASK_HEIGHT / 2 : node.position.y),
    }
    onPositionChange?.(step, position)
    const reordered = [...ordered]
      .sort((a, b) => {
        const ax = a.id === step.id ? position.boardX : FIRST_STEP_X + (Number(a.stepOrder || 1) - 1) * STEP_GAP
        const bx = b.id === step.id ? position.boardX : FIRST_STEP_X + (Number(b.stepOrder || 1) - 1) * STEP_GAP
        return ax - bx
      })
      .map((item, index) => ({ ...item, stepOrder: index + 1 }))
    const changed = reordered.some((item) => ordered.find((current) => current.id === item.id)?.stepOrder !== item.stepOrder)
    if (changed) onReorder?.(reordered)
  }

  function handleNodeClick(_: unknown, node: Node) {
    const stepId = node.id.startsWith("decision-") ? node.id.replace("decision-", "") : node.id
    const step = ordered.find((item) => item.id === stepId)
    setSelectedStepId(step?.id || null)
  }

  function handleNodeDoubleClick(_: unknown, node: Node) {
    const stepId = node.id.startsWith("decision-") ? node.id.replace("decision-", "") : node.id
    const step = ordered.find((item) => item.id === stepId)
    if (step) onEditStep?.(step)
  }

  function handleMoveEnd(_: unknown, nextViewport: { x: number; y: number; zoom: number }) {
    onViewportChange?.({
      x: Math.round(nextViewport.x),
      y: Math.round(nextViewport.y),
      zoom: Number(nextViewport.zoom.toFixed(3)),
    })
  }

  return (
    <div className="workflow-flow-canvas" style={{ minHeight: boardHeight }}>
      <ReactFlowProvider>
        <ReactFlow
          key={flowKey}
          className="workflow-flow-canvas__flow"
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          defaultEdges={edges}
          defaultNodes={nodes}
          maxZoom={1.6}
          minZoom={0.35}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesFocusable
          onMoveEnd={handleMoveEnd}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeDragStop={handleNodeDragStop}
          panOnDrag
          panOnScroll
          proOptions={{ hideAttribution: true }}
          zoomOnDoubleClick
          zoomOnPinch
          zoomOnScroll
        >
          <Background color="rgba(179, 0, 0, 0.16)" gap={24} size={1} variant={BackgroundVariant.Lines} />
        </ReactFlow>
      </ReactFlowProvider>
      <div className="workflow-flow-canvas__toolbar">
        <Space size={6}>
          <Tooltip title="Thêm bước mới">
            <Button ghost icon={<PlusOutlined />} size="small" onClick={onAddStep} />
          </Tooltip>
        </Space>
      </div>
      {selectedStep ? (
        <div className="workflow-flow-canvas__actionbar">
          <Typography.Text strong>{selectedStep.name}</Typography.Text>
          <Space size={6}>
            <Button ghost icon={<EditOutlined />} size="small" onClick={() => onEditStep?.(selectedStep)}>Sửa</Button>
            <Button ghost icon={<PlusOutlined />} size="small" onClick={() => onInsertAfterStep?.(selectedStep)}>Thêm sau</Button>
          </Space>
        </div>
      ) : null}
      {steps.length === 0 ? <div className="workflow-flow-canvas__empty">Chưa có bước duyệt</div> : null}
    </div>
  )
}

function makeEdge(
  source: string,
  target: string,
  id: string,
  label: string,
  tone: "approve" | "reject" | "neutral",
  sourceHandle?: string,
  routeOffset = 0,
): Edge {
  const isReject = tone === "reject"
  const isApprove = tone === "approve"
  return {
    id,
    source,
    target,
    sourceHandle,
    type: "smoothstep",
    label,
    pathOptions: {
      borderRadius: 10,
      // Offset differs per reject edge, giving each branch a separate route.
      offset: routeOffset || 24,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isApprove ? "#16a34a" : isReject ? "#dc2626" : "#334155",
      width: 18,
      height: 18,
    },
    style: {
      stroke: isApprove ? "#16a34a" : isReject ? "#dc2626" : "#334155",
      strokeDasharray: isReject ? "7 7" : undefined,
      strokeWidth: isApprove || isReject ? 2.6 : 2.2,
    },
    labelBgBorderRadius: 6,
    labelBgPadding: [6, 3],
    labelStyle: {
      fill: isApprove ? "#15803d" : isReject ? "#b91c1c" : "#475569",
      fontSize: 11,
      fontWeight: 700,
    },
  } as Edge
}

function buildLanes(steps: WorkflowCanvasStep[]) {
  const lanes: Lane[] = [{ id: "requester", label: "Requester", index: 0 }]
  steps.forEach((step) => {
    const id = stepLaneId(step)
    if (!lanes.some((lane) => lane.id === id)) lanes.push({ id, label: approverLabel(step), index: lanes.length })
  })
  lanes.push({ id: "system", label: "System", index: lanes.length })
  return lanes.map((lane, index) => ({ ...lane, index }))
}

function laneCenter(lane: Lane) {
  return lane.index * LANE_HEIGHT + LANE_HEIGHT / 2
}

function stepLaneId(step: WorkflowCanvasStep) {
  switch (step.approverType) {
    case "ROLE": return `role:${step.approverRoleKey || "ADMIN"}`
    case "FIXED_STAFF": return "fixed-staff"
    case "FIXED_USER": return "fixed-user"
    case "EMPLOYEE_MENTOR": return "mentor"
    case "DEPARTMENT_MANAGER": return "department-manager"
    default: return "leader"
  }
}

function decisionId(stepId: string) {
  return `decision-${stepId}`
}

function layoutPosition(layout: Record<string, { x?: number; y?: number }> | undefined, nodeId: string, fallbackX: number, fallbackY: number) {
  const saved = layout?.[nodeId]
  return {
    x: Number(saved?.x ?? fallbackX),
    y: Number(saved?.y ?? fallbackY),
  }
}

function ApprovalTaskNode({ data, selected }: any) {
  const step = data.step as WorkflowCanvasStep
  return (
    <div className={`workflow-task-node ${selected || data.selected ? "workflow-task-node--selected" : ""} ${!step.isActive ? "workflow-task-node--inactive" : ""}`}>
      <Handle className="workflow-handle" position={Position.Left} type="target" />
      <div className="workflow-task-node__kicker">Step {step.stepOrder}</div>
      <div className="workflow-task-node__title">{step.stateLabel || step.name || "Bước duyệt"}</div>
      <div className="workflow-task-node__meta">{data.approver}</div>
      <Handle className="workflow-handle" position={Position.Right} type="source" />
    </div>
  )
}

function DecisionNode({ data }: any) {
  return (
    <div className="workflow-decision-node">
      <Handle className="workflow-handle" position={Position.Left} type="target" />
      <Handle className="workflow-handle workflow-handle--approve" id="approve" position={Position.Right} type="source" />
      <Handle className="workflow-handle workflow-handle--reject" id="reject" position={Position.Bottom} type="source" />
      <span>{data.label}</span>
      <small>{data.approveLabel} / {data.rejectLabel}</small>
    </div>
  )
}

function StartEndNode({ data }: any) {
  return (
    <div className={`workflow-terminal-node workflow-terminal-node--${data.tone || "neutral"}`}>
      <Handle className="workflow-handle" position={Position.Left} type="target" />
      <span>{data.label}</span>
      <Handle className="workflow-handle" position={Position.Right} type="source" />
    </div>
  )
}

function SwimlaneNode({ data }: any) {
  return (
    <div className="workflow-swimlane-node">
      <div className="workflow-swimlane-node__label">{data.label}</div>
    </div>
  )
}

function approverLabel(step: WorkflowCanvasStep) {
  switch (step.approverType) {
    case "ROLE": return `Role ${step.approverRoleKey || "ADMIN"}`
    case "FIXED_STAFF": return "Nhân sự cố định"
    case "FIXED_USER": return "User cố định"
    case "EMPLOYEE_MENTOR": return "Mentor"
    case "DEPARTMENT_MANAGER": return "Trưởng phòng"
    default: return "Leader"
  }
}
