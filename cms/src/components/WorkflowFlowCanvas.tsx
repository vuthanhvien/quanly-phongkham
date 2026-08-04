import { AimOutlined, EditOutlined, PlusOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons"
import { Button, Space, Tooltip, Typography } from "antd"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

export type WorkflowCanvasStep = {
  id: string
  name: string
  stepOrder: number
  approverType: string
  approverRoleKey?: string
  isActive: boolean
}

type Props = {
  steps: WorkflowCanvasStep[]
  onAddStep?: () => void
  onEditStep?: (step: WorkflowCanvasStep) => void
  onInsertAfterStep?: (step: WorkflowCanvasStep) => void
  onReorder?: (steps: WorkflowCanvasStep[]) => void
}

const NODE_WIDTH = 190
const NODE_HEIGHT = 86
const NODE_GAP = 72
const GRID_SIZE = 2400
const GRID_STEP = 48

export function WorkflowFlowCanvas({ steps, onAddStep, onEditStep, onInsertAfterStep, onReorder }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const stateRef = useRef<{
    camera?: THREE.OrthographicCamera
    dragging?: { mesh: THREE.Mesh; pointerId: number; moved: boolean; offset: THREE.Vector3 }
    frame?: number
    grid?: THREE.LineSegments
    line?: THREE.Line
    nodes: Map<string, THREE.Mesh>
    panning?: { pointerId: number; startX: number; startY: number; cameraX: number; cameraY: number }
    positions: Map<string, THREE.Vector3>
    raycaster: THREE.Raycaster
    renderer?: THREE.WebGLRenderer
    scene?: THREE.Scene
    selectedStepId: string | null
    steps: WorkflowCanvasStep[]
  }>({
    nodes: new Map(),
    positions: new Map(),
    raycaster: new THREE.Raycaster(),
    selectedStepId,
    steps,
  })

  const selectedStep = steps.find((step) => step.id === selectedStepId)

  useEffect(() => {
    stateRef.current.steps = steps
    if (selectedStepId && !steps.some((step) => step.id === selectedStepId)) setSelectedStepId(null)
    syncScene()
  }, [steps, selectedStepId])

  useEffect(() => {
    stateRef.current.selectedStepId = selectedStepId
  }, [selectedStepId])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.className = "workflow-flow-canvas__surface"
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000)
    camera.position.set(0, 0, 10)

    stateRef.current.renderer = renderer
    stateRef.current.scene = scene
    stateRef.current.camera = camera
    stateRef.current.grid = buildGrid()
    scene.add(stateRef.current.grid)

    const resize = () => {
      const width = host.clientWidth || 720
      const height = host.clientHeight || 280
      renderer.setSize(width, height, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()
      render()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    syncScene()

    renderer.domElement.addEventListener("pointerdown", handlePointerDown)
    renderer.domElement.addEventListener("pointermove", handlePointerMove)
    renderer.domElement.addEventListener("pointerup", handlePointerUp)
    renderer.domElement.addEventListener("pointercancel", handlePointerUp)
    renderer.domElement.addEventListener("dblclick", handleDoubleClick)
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      observer.disconnect()
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
      renderer.domElement.removeEventListener("pointermove", handlePointerMove)
      renderer.domElement.removeEventListener("pointerup", handlePointerUp)
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp)
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick)
      renderer.domElement.removeEventListener("wheel", handleWheel)
      if (stateRef.current.frame) cancelAnimationFrame(stateRef.current.frame)
      disposeScene()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  function syncScene() {
    const state = stateRef.current
    if (!state.scene) return
    const ordered = [...state.steps].sort((a, b) => Number(a.stepOrder || 0) - Number(b.stepOrder || 0))
    const totalWidth = ordered.length * NODE_WIDTH + Math.max(0, ordered.length - 1) * NODE_GAP
    ordered.forEach((step, index) => {
      if (!state.positions.has(step.id)) {
        state.positions.set(step.id, new THREE.Vector3(-totalWidth / 2 + NODE_WIDTH / 2 + index * (NODE_WIDTH + NODE_GAP), 0, 0))
      }
    })

    for (const [id, mesh] of state.nodes) {
      if (!ordered.some((step) => step.id === id)) {
        disposeObject(mesh)
        state.scene.remove(mesh)
        state.nodes.delete(id)
        state.positions.delete(id)
      }
    }

    ordered.forEach((step) => {
      let mesh = state.nodes.get(step.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(NODE_WIDTH, NODE_HEIGHT),
          new THREE.MeshBasicMaterial({ map: buildNodeTexture(step, state.selectedStepId === step.id), transparent: true }),
        )
        mesh.userData.stepId = step.id
        state.nodes.set(step.id, mesh)
        state.scene!.add(mesh)
      } else {
        const material = mesh.material as THREE.MeshBasicMaterial
        material.map?.dispose()
        material.map = buildNodeTexture(step, state.selectedStepId === step.id)
        material.needsUpdate = true
      }
      mesh.position.copy(state.positions.get(step.id) || new THREE.Vector3())
    })

    updateLine()
    render()
  }

  function updateLine() {
    const state = stateRef.current
    if (!state.scene) return
    if (state.line) {
      state.line.geometry.dispose()
      state.scene.remove(state.line)
      state.line = undefined
    }
    const ordered = [...state.steps].sort((a, b) => Number(a.stepOrder || 0) - Number(b.stepOrder || 0))
    const points: THREE.Vector3[] = []
    ordered.forEach((step) => {
      const pos = state.positions.get(step.id)
      if (pos) points.push(new THREE.Vector3(pos.x, pos.y, -2))
    })
    if (points.length < 2) return
    state.line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xb30000, linewidth: 2, transparent: true, opacity: 0.55 }),
    )
    state.scene.add(state.line)
  }

  function render() {
    const state = stateRef.current
    if (!state.renderer || !state.scene || !state.camera) return
    state.renderer.render(state.scene, state.camera)
  }

  function requestRender() {
    const state = stateRef.current
    if (state.frame) return
    state.frame = requestAnimationFrame(() => {
      state.frame = undefined
      render()
    })
  }

  function handlePointerDown(event: PointerEvent) {
    const state = stateRef.current
    event.preventDefault()
    const hit = intersectNode(event)
    if (!hit) {
      state.panning = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        cameraX: state.camera?.position.x || 0,
        cameraY: state.camera?.position.y || 0,
      }
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      setSelectedStepId(null)
      return
    }
    const world = pointerToWorld(event)
    if (!world) return
    state.dragging = {
      mesh: hit,
      pointerId: event.pointerId,
      moved: false,
      offset: hit.position.clone().sub(world),
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent) {
    const state = stateRef.current
    const dragging = state.dragging
    if (dragging && dragging.pointerId === event.pointerId) {
      const world = pointerToWorld(event)
      if (!world) return
      const next = world.add(dragging.offset)
      if (Math.abs(next.x - dragging.mesh.position.x) > 2 || Math.abs(next.y - dragging.mesh.position.y) > 2) dragging.moved = true
      dragging.mesh.position.set(next.x, Math.max(-96, Math.min(96, next.y)), 0)
      state.positions.set(String(dragging.mesh.userData.stepId), dragging.mesh.position.clone())
      updateLine()
      requestRender()
      return
    }
    const panning = state.panning
    if (panning && panning.pointerId === event.pointerId && state.camera) {
      const zoom = state.camera.zoom || 1
      state.camera.position.x = panning.cameraX - (event.clientX - panning.startX) / zoom
      state.camera.position.y = panning.cameraY + (event.clientY - panning.startY) / zoom
      requestRender()
    }
  }

  function handlePointerUp(event: PointerEvent) {
    const state = stateRef.current
    const dragging = state.dragging
    const panning = state.panning
    if (panning && panning.pointerId === event.pointerId) {
      state.panning = undefined
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
      return
    }
    if (!dragging || dragging.pointerId !== event.pointerId) return
    state.dragging = undefined
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    const step = state.steps.find((item) => item.id === dragging.mesh.userData.stepId)
    if (!step) return
    setSelectedStepId(step.id)
    if (dragging.moved) {
      const reordered = [...state.steps]
        .sort((a, b) => (state.positions.get(a.id)?.x || 0) - (state.positions.get(b.id)?.x || 0))
        .map((item, index) => ({ ...item, stepOrder: index + 1 }))
      const changed = reordered.some((item) => state.steps.find((current) => current.id === item.id)?.stepOrder !== item.stepOrder)
      if (changed) onReorder?.(reordered)
      render()
    }
  }

  function handleDoubleClick(event: MouseEvent) {
    const hit = intersectNode(event)
    const step = stateRef.current.steps.find((item) => item.id === hit?.userData.stepId)
    if (step) onEditStep?.(step)
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.12 : 0.12
    setZoom((stateRef.current.camera?.zoom || 1) + delta)
  }

  function setZoom(nextZoom: number) {
    const camera = stateRef.current.camera
    if (!camera) return
    camera.zoom = Math.max(0.45, Math.min(1.8, nextZoom))
    camera.updateProjectionMatrix()
    requestRender()
  }

  function resetView() {
    const state = stateRef.current
    state.positions.clear()
    if (state.camera) {
      state.camera.position.set(0, 0, 10)
      state.camera.zoom = 1
      state.camera.updateProjectionMatrix()
    }
    setSelectedStepId(null)
    syncScene()
  }

  function intersectNode(event: MouseEvent | PointerEvent) {
    const state = stateRef.current
    if (!state.camera || !state.renderer) return null
    const rect = state.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    state.raycaster.setFromCamera(mouse, state.camera)
    const hits = state.raycaster.intersectObjects([...state.nodes.values()])
    return (hits[0]?.object as THREE.Mesh | undefined) || null
  }

  function pointerToWorld(event: MouseEvent | PointerEvent) {
    const state = stateRef.current
    if (!state.camera || !state.renderer) return null
    const rect = state.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector3(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
      0,
    )
    return mouse.unproject(state.camera)
  }

  function disposeScene() {
    const state = stateRef.current
    state.nodes.forEach(disposeObject)
    state.nodes.clear()
    state.grid?.geometry.dispose()
    ;(state.grid?.material as THREE.Material | undefined)?.dispose()
    state.grid = undefined
    state.line?.geometry.dispose()
    state.line = undefined
  }

  return (
    <div className="workflow-flow-canvas" ref={hostRef}>
      <div className="workflow-flow-canvas__toolbar">
        <Space size={6}>
          <Tooltip title="Thêm bước mới">
            <Button ghost icon={<PlusOutlined />} size="small" onClick={onAddStep} />
          </Tooltip>
          <Tooltip title="Thu nhỏ">
            <Button ghost icon={<ZoomOutOutlined />} size="small" onClick={() => setZoom((stateRef.current.camera?.zoom || 1) - 0.15)} />
          </Tooltip>
          <Tooltip title="Phóng to">
            <Button ghost icon={<ZoomInOutlined />} size="small" onClick={() => setZoom((stateRef.current.camera?.zoom || 1) + 0.15)} />
          </Tooltip>
          <Tooltip title="Căn lại board">
            <Button ghost icon={<AimOutlined />} size="small" onClick={resetView} />
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

function buildGrid() {
  const points: THREE.Vector3[] = []
  const colors: number[] = []
  for (let index = -GRID_SIZE; index <= GRID_SIZE; index += GRID_STEP) {
    const isMajor = index % (GRID_STEP * 5) === 0
    const color = new THREE.Color(isMajor ? 0xd7b4b4 : 0xeadada)
    points.push(new THREE.Vector3(-GRID_SIZE, index, -12), new THREE.Vector3(GRID_SIZE, index, -12))
    points.push(new THREE.Vector3(index, -GRID_SIZE, -12), new THREE.Vector3(index, GRID_SIZE, -12))
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b)
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72 }))
}

function disposeObject(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh
  mesh.geometry?.dispose()
  const material = mesh.material as THREE.MeshBasicMaterial | undefined
  material?.map?.dispose()
  material?.dispose()
}

function buildNodeTexture(step: WorkflowCanvasStep, selected: boolean) {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  roundedRect(ctx, 20, 18, 472, 216, 26)
  const gradient = ctx.createLinearGradient(0, 18, 512, 234)
  gradient.addColorStop(0, step.isActive ? "#ffffff" : "#f3f4f6")
  gradient.addColorStop(1, step.isActive ? "#fff4f4" : "#e5e7eb")
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.strokeStyle = selected ? "#111827" : step.isActive ? "#b30000" : "#9ca3af"
  ctx.lineWidth = selected ? 8 : 5
  ctx.stroke()

  ctx.fillStyle = step.isActive ? "#b30000" : "#6b7280"
  ctx.font = "700 30px Arial"
  ctx.fillText(`Step ${step.stepOrder}`, 48, 68)

  ctx.fillStyle = "#111827"
  ctx.font = "700 34px Arial"
  wrapText(ctx, step.name || "Bước duyệt", 48, 118, 416, 38, 2)

  ctx.fillStyle = "#6b7280"
  ctx.font = "600 24px Arial"
  ctx.fillText(approverLabel(step), 48, 204)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(" ")
  let line = ""
  let lineIndex = 0
  words.forEach((word, index) => {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight)
      line = word
      lineIndex += 1
    } else {
      line = test
    }
    if (index === words.length - 1 && lineIndex < maxLines) ctx.fillText(line, x, y + lineIndex * lineHeight)
  })
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
