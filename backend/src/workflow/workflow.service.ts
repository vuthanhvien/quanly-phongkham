import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/auth';
import {
  Attendance,
  AttendanceAdjustmentRequest,
  BranchRoleAssignment,
  BusinessTripRequest,
  Department,
  LeaveRequest,
  PaymentRequest,
  SoftwareLicense,
  SoftwareLicenseAssignment,
  Staff,
  User,
  WorkflowAction,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  WorkflowTask,
} from '../entities/entities';

type WorkflowTargetResource =
  | 'leave-requests'
  | 'attendance-adjustment-requests'
  | 'business-trip-requests'
  | 'payment-requests'
  | 'software-license-assignments';

type TargetRecord = LeaveRequest | AttendanceAdjustmentRequest | BusinessTripRequest | PaymentRequest | SoftwareLicenseAssignment;
type WorkflowAssignee = { userId?: string; staffId?: string };

const DEFAULT_WORKFLOWS: Array<{
  code: string;
  name: string;
  targetResource: WorkflowTargetResource;
  description: string;
  steps: Array<{ name: string; approverType: string; approverRoleKey?: string; boardX?: number; boardY?: number; stateKey?: string; stateLabel?: string; approveActionLabel?: string; rejectActionLabel?: string }>;
}> = [
    {
      code: 'leave-request-default',
      name: 'Duyệt đơn xin nghỉ',
      targetResource: 'leave-requests',
      description: 'Leader hoặc mentor của nhân viên duyệt đơn nghỉ phép.',
      steps: [{ name: 'Leader/Mentor duyệt', approverType: 'EMPLOYEE_LEADER', boardX: 0, boardY: 0, stateKey: 'leader_review', stateLabel: 'Chờ Leader duyệt' }],
    },
    {
      code: 'attendance-adjustment-default',
      name: 'Duyệt đổi giờ chấm công',
      targetResource: 'attendance-adjustment-requests',
      description: 'Leader hoặc trưởng bộ phận duyệt yêu cầu đổi giờ check-in/check-out.',
      steps: [{ name: 'Leader duyệt', approverType: 'EMPLOYEE_LEADER', boardX: 0, boardY: 0, stateKey: 'leader_review', stateLabel: 'Chờ Leader xác nhận' }],
    },
    {
      code: 'business-trip-default',
      name: 'Duyệt đơn công tác',
      targetResource: 'business-trip-requests',
      description: 'Leader duyệt trước, sau đó HR/Admin xác nhận.',
      steps: [
        { name: 'Leader duyệt', approverType: 'EMPLOYEE_LEADER', boardX: -150, boardY: 0, stateKey: 'leader_review', stateLabel: 'Chờ Leader duyệt' },
        { name: 'HR/Admin xác nhận', approverType: 'ROLE', approverRoleKey: 'ADMIN', boardX: 150, boardY: 0, stateKey: 'hr_confirm', stateLabel: 'Chờ HR/Admin xác nhận' },
      ],
    },
    {
      code: 'payment-request-default',
      name: 'Duyệt xin thanh toán',
      targetResource: 'payment-requests',
      description: 'Leader duyệt trước, sau đó Admin/Kế toán xác nhận.',
      steps: [
        { name: 'Leader duyệt', approverType: 'EMPLOYEE_LEADER', boardX: -150, boardY: 0, stateKey: 'leader_review', stateLabel: 'Chờ Leader duyệt' },
        { name: 'Kế toán/Admin xác nhận', approverType: 'ROLE', approverRoleKey: 'ADMIN', boardX: 150, boardY: 0, stateKey: 'accounting_review', stateLabel: 'Chờ kế toán xác nhận' },
      ],
    },
    {
      code: 'software-license-assignment-default',
      name: 'Duyệt cấp phát bản quyền phần mềm',
      targetResource: 'software-license-assignments',
      description: 'Leader xác nhận nhu cầu, sau đó IT/Admin cấp seat phần mềm cho nhân viên.',
      steps: [
        { name: 'Leader xác nhận nhu cầu', approverType: 'EMPLOYEE_LEADER', boardX: -150, boardY: 0, stateKey: 'PENDING_MANAGER', stateLabel: 'Chờ Leader duyệt' },
        { name: 'IT/Admin cấp seat', approverType: 'ROLE', approverRoleKey: 'ADMIN', boardX: 150, boardY: 0, stateKey: 'PENDING_IT', stateLabel: 'Chờ IT/Admin cấp' },
      ],
    },
  ];

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Attendance) private readonly attendances: Repository<Attendance>,
    @InjectRepository(AttendanceAdjustmentRequest) private readonly attendanceAdjustments: Repository<AttendanceAdjustmentRequest>,
    @InjectRepository(BranchRoleAssignment) private readonly branchAssignments: Repository<BranchRoleAssignment>,
    @InjectRepository(BusinessTripRequest) private readonly businessTrips: Repository<BusinessTripRequest>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(LeaveRequest) private readonly leaveRequests: Repository<LeaveRequest>,
    @InjectRepository(PaymentRequest) private readonly paymentRequests: Repository<PaymentRequest>,
    @InjectRepository(SoftwareLicense) private readonly softwareLicenses: Repository<SoftwareLicense>,
    @InjectRepository(SoftwareLicenseAssignment) private readonly softwareLicenseAssignments: Repository<SoftwareLicenseAssignment>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(WorkflowAction) private readonly actions: Repository<WorkflowAction>,
    @InjectRepository(WorkflowDefinition) private readonly definitions: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance) private readonly instances: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowStep) private readonly steps: Repository<WorkflowStep>,
    @InjectRepository(WorkflowTask) private readonly tasks: Repository<WorkflowTask>,
  ) { }

  async bootstrapDefaults (_user?: AuthUser) {
    const created: WorkflowDefinition[] = [];
    for (const config of DEFAULT_WORKFLOWS) {
      let definition = await this.definitions.findOne({ where: { code: config.code, isArchived: false } });
      if (!definition) {
        definition = await this.definitions.save(this.definitions.create({
          code: config.code,
          name: config.name,
          targetResource: config.targetResource,
          description: config.description,
          submitStatuses: config.targetResource === 'software-license-assignments' ? ['PENDING'] : ['pending', 'submitted'],
          approvedStatus: config.targetResource === 'software-license-assignments' ? 'ACTIVE' : 'approved',
          rejectedStatus: config.targetResource === 'software-license-assignments' ? 'REJECTED' : 'rejected',
          cancelledStatus: config.targetResource === 'software-license-assignments' ? 'CANCELLED' : 'cancelled',
          isActive: true,
        }));
        created.push(definition);
      }
      const existingSteps = await this.steps.find({ where: { definitionId: definition.id } });
      if (existingSteps.length === 0) {
        await this.steps.save(config.steps.map((step, index) => this.steps.create({
          definitionId: definition.id,
          name: step.name,
          stateKey: step.stateKey || `step_${index + 1}`,
          stateLabel: step.stateLabel || step.name,
          stepOrder: index + 1,
          approverType: step.approverType,
          approverRoleKey: step.approverRoleKey,
          approvalMode: 'any',
          approveActionLabel: step.approveActionLabel || 'Duyệt',
          rejectActionLabel: step.rejectActionLabel || 'Từ chối',
          boardX: step.boardX ?? index * 280,
          boardY: step.boardY ?? 0,
          isActive: true,
        })));
      }
    }
    return { data: { created: created.length } };
  }

  async listDefinitions (_user?: AuthUser) {
    await this.ensureDefaultDefinitions();
    const definitions = await this.definitions.find({ where: { isArchived: false }, order: { targetResource: 'ASC', createdAt: 'DESC' } });
    const steps = await this.steps.find({ order: { stepOrder: 'ASC' } });
    return {
      data: definitions.map((definition) => ({
        ...definition,
        steps: steps.filter((step) => step.definitionId === definition.id),
      })),
      total: definitions.length,
    };
  }

  async startForRecord (resource: string, record: Record<string, unknown>, user?: AuthUser) {
    if (!this.isWorkflowResource(resource)) return null;
    const recordId = String(record.id || '');
    if (!recordId) return null;
    const existing = await this.instances.findOne({ where: { targetResource: resource, targetRecordId: recordId, status: 'pending' } });
    if (existing) return existing;

    await this.ensureDefaultDefinitions();
    const definition = await this.definitions.findOne({ where: { targetResource: resource, isActive: true, isArchived: false } });
    if (!definition) return null;
    const status = String(record.status || '').toLowerCase();
    const submitStatuses = this.normalizeStatusList(definition.submitStatuses);
    if (!submitStatuses.includes(status)) return null;
    const firstStep = await this.steps.findOne({ where: { definitionId: definition.id, isActive: true }, order: { stepOrder: 'ASC' } });
    if (!firstStep) return null;

    const requesterStaffId = this.resolveRequesterStaffId(record, user);
    const instance = await this.instances.save(this.instances.create({
      definitionId: definition.id,
      targetResource: resource,
      targetRecordId: recordId,
      requesterUserId: user?.id,
      requesterStaffId,
      currentStepOrder: firstStep.stepOrder,
      status: 'pending',
    }));
    await this.actions.save(this.actions.create({
      instanceId: instance.id,
      action: 'submit',
      actorUserId: user?.id,
      actorStaffId: user?.staffId,
    }));
    await this.applyStepStatus(instance, firstStep);
    await this.createTasksForStep(instance, firstStep);
    return instance;
  }

  async myTasks (user: AuthUser) {
    const userIds = [user.id].filter(Boolean);
    const staffIds = [user.staffId].filter(Boolean) as string[];
    const tasks = await this.tasks.find({ where: { status: 'pending' }, order: { createdAt: 'DESC' } });
    const mine = tasks.filter((task) =>
      (task.assigneeUserId && userIds.includes(task.assigneeUserId)) ||
      (task.assigneeStaffId && staffIds.includes(task.assigneeStaffId)),
    );
    const instances = mine.length
      ? await this.instances.find({ where: mine.map((task) => ({ id: task.instanceId })) })
      : [];
    const definitions = instances.length
      ? await this.definitions.find({ where: instances.map((instance) => ({ id: instance.definitionId })) })
      : [];
    const steps = instances.length
      ? await this.steps.find({ where: instances.map((instance) => ({ definitionId: instance.definitionId })) })
      : [];
    const records = await this.loadTargetRecords(instances);
    return {
      data: mine.map((task) => {
        const instance = instances.find((item) => item.id === task.instanceId);
        const definition = definitions.find((item) => item.id === instance?.definitionId);
        const step = steps.find((item) => item.id === task.stepId || (item.definitionId === instance?.definitionId && item.stepOrder === task.stepOrder));
        return {
          ...task,
          instance,
          definition,
          step,
          targetRecord: instance ? records.get(`${instance.targetResource}:${instance.targetRecordId}`) : null,
        };
      }),
      total: mine.length,
    };
  }

  async instanceDetail (id: string, user: AuthUser) {
    const instance = await this.instances.findOne({ where: { id } });
    if (!instance) throw new NotFoundException('Workflow không tồn tại');
    const [definition, steps, tasks, actions] = await Promise.all([
      this.definitions.findOne({ where: { id: instance.definitionId } }),
      this.steps.find({ where: { definitionId: instance.definitionId }, order: { stepOrder: 'ASC' } }),
      this.tasks.find({ where: { instanceId: id }, order: { createdAt: 'ASC' } }),
      this.actions.find({ where: { instanceId: id }, order: { createdAt: 'ASC' } }),
    ]);
    if (!this.canSeeInstance(instance, tasks, user)) throw new ForbiddenException('Bạn không có quyền xem workflow này');
    return {
      data: {
        ...instance,
        definition,
        steps,
        tasks,
        actions,
        targetRecord: await this.loadTargetRecord(instance.targetResource, instance.targetRecordId),
      },
    };
  }

  async approve (instanceId: string, note: string | undefined, user: AuthUser) {
    const { instance, task } = await this.findActionableTask(instanceId, user);
    task.status = 'approved';
    task.actedAt = new Date();
    task.note = note;
    await this.tasks.save(task);
    await this.actions.save(this.actions.create({
      instanceId,
      taskId: task.id,
      action: 'approve',
      actorUserId: user.id,
      actorStaffId: user.staffId,
      note,
    }));

    const currentPending = await this.tasks.find({ where: { instanceId, stepOrder: task.stepOrder, status: 'pending' } });
    if (currentPending.length > 0) return this.instanceDetail(instanceId, user);

    const steps = await this.steps.find({ where: { definitionId: instance.definitionId, isActive: true }, order: { stepOrder: 'ASC' } });
    const currentStep = steps.find((step) => step.id === task.stepId || step.stepOrder === task.stepOrder);
    const approveTerminal = currentStep?.approveNextStepId === '__REJECT' ? 'rejected' : 'approved';
    const nextStep = currentStep?.approveNextStepId
      ? steps.find((step) => step.id === currentStep.approveNextStepId) || null
      : steps.find((step) => step.stepOrder > task.stepOrder) || null;

    if (nextStep) {
      instance.currentStepOrder = nextStep.stepOrder;
      await this.instances.save(instance);
      await this.applyStepStatus(instance, nextStep);
      await this.createTasksForStep(instance, nextStep);
      await this.actions.save(this.actions.create({ instanceId, action: 'advance', actorUserId: user.id, actorStaffId: user.staffId }));
      return this.instanceDetail(instanceId, user);
    }

    instance.status = approveTerminal;
    instance.completedAt = new Date();
    await this.instances.save(instance);
    await this.applyFinalStatus(instance, approveTerminal, user);
    await this.actions.save(this.actions.create({
      instanceId,
      action: approveTerminal === 'approved' ? 'complete' : 'approve_to_reject',
      actorUserId: user.id,
      actorStaffId: user.staffId,
    }));
    return this.instanceDetail(instanceId, user);
  }

  async reject (instanceId: string, note: string | undefined, user: AuthUser) {
    const { instance, task } = await this.findActionableTask(instanceId, user);
    task.status = 'rejected';
    task.actedAt = new Date();
    task.note = note;
    const steps = await this.steps.find({ where: { definitionId: instance.definitionId, isActive: true }, order: { stepOrder: 'ASC' } });
    const currentStep = steps.find((step) => step.id === task.stepId || step.stepOrder === task.stepOrder);
    const rejectNextStep = currentStep?.rejectBehavior === 'GOTO_STEP' && currentStep.rejectNextStepId
      ? steps.find((step) => step.id === currentStep.rejectNextStepId) || null
      : null;
    if (rejectNextStep) {
      instance.currentStepOrder = rejectNextStep.stepOrder;
      await Promise.all([
        this.tasks.save(task),
        this.instances.save(instance),
        this.applyStepStatus(instance, rejectNextStep),
        this.createTasksForStep(instance, rejectNextStep),
        this.actions.save(this.actions.create({ instanceId, taskId: task.id, action: 'reject_route', actorUserId: user.id, actorStaffId: user.staffId, note })),
      ]);
      return this.instanceDetail(instanceId, user);
    }
    instance.status = 'rejected';
    instance.completedAt = new Date();
    await Promise.all([
      this.tasks.save(task),
      this.instances.save(instance),
      this.tasks.update({ instanceId, status: 'pending' }, { status: 'cancelled' }),
      this.applyFinalStatus(instance, 'rejected', user),
      this.actions.save(this.actions.create({ instanceId, taskId: task.id, action: 'reject', actorUserId: user.id, actorStaffId: user.staffId, note })),
    ]);
    return this.instanceDetail(instanceId, user);
  }

  async cancel (instanceId: string, note: string | undefined, user: AuthUser) {
    const instance = await this.instances.findOne({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow không tồn tại');
    if (instance.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ người tạo hoặc admin được hủy workflow');
    }
    instance.status = 'cancelled';
    instance.completedAt = new Date();
    await Promise.all([
      this.instances.save(instance),
      this.tasks.update({ instanceId, status: 'pending' }, { status: 'cancelled' }),
      this.applyFinalStatus(instance, 'cancelled', user),
      this.actions.save(this.actions.create({ instanceId, action: 'cancel', actorUserId: user.id, actorStaffId: user.staffId, note })),
    ]);
    return this.instanceDetail(instanceId, user);
  }

  private async ensureDefaultDefinitions () {
    await this.bootstrapDefaults();
  }

  private isWorkflowResource (resource: string): resource is WorkflowTargetResource {
    return ['leave-requests', 'attendance-adjustment-requests', 'business-trip-requests', 'payment-requests', 'software-license-assignments'].includes(resource);
  }

  private resolveRequesterStaffId (record: Record<string, unknown>, user?: AuthUser) {
    return String(record.staffId || user?.staffId || '').trim() || undefined;
  }

  private async createTasksForStep (instance: WorkflowInstance, step: WorkflowStep) {
    const target = await this.loadTargetRecord(instance.targetResource, instance.targetRecordId);
    let assignees = await this.resolveApprovers(step, target, instance);
    if (assignees.length === 0) {
      assignees = await this.roleAssignees('ADMIN');
    }
    if (assignees.length === 0) {
      throw new BadRequestException(`Không tìm thấy người duyệt cho bước "${step.name}"`);
    }
    await this.tasks.save(assignees.map((assignee) => this.tasks.create({
      instanceId: instance.id,
      stepId: step.id,
      stepOrder: step.stepOrder,
      assigneeUserId: assignee.userId,
      assigneeStaffId: assignee.staffId,
      status: 'pending',
    })));
  }

  private async resolveApprovers (step: WorkflowStep, target: TargetRecord, instance: WorkflowInstance): Promise<WorkflowAssignee[]> {
    switch (step.approverType) {
      case 'FIXED_USER':
        return [{ userId: step.approverUserId, staffId: undefined }].filter((item) => item.userId);
      case 'FIXED_STAFF':
        return [await this.assigneeFromStaffId(step.approverStaffId)].filter(Boolean) as WorkflowAssignee[];
      case 'EMPLOYEE_MENTOR':
        return [await this.assigneeFromEmployeeRelation(target, 'mentorStaffId')].filter(Boolean) as WorkflowAssignee[];
      case 'DEPARTMENT_MANAGER':
        return [await this.departmentManagerAssignee(target)].filter(Boolean) as WorkflowAssignee[];
      case 'ROLE':
        return this.roleAssignees(step.approverRoleKey);
      case 'EMPLOYEE_LEADER':
      default:
        return [
          await this.assigneeFromEmployeeRelation(target, 'leaderStaffId'),
          await this.assigneeFromEmployeeRelation(target, 'mentorStaffId'),
          await this.departmentManagerAssignee(target),
        ].filter(Boolean).slice(0, 1) as WorkflowAssignee[];
    }
  }

  private async assigneeFromEmployeeRelation (target: TargetRecord, key: 'leaderStaffId' | 'mentorStaffId') {
    const employee = await this.staff.findOne({ where: { id: target.staffId } });
    return this.assigneeFromStaffId(employee?.[key]);
  }

  private async departmentManagerAssignee (target: TargetRecord) {
    const employee = await this.staff.findOne({ where: { id: target.staffId } });
    if (!employee?.departmentId) return null;
    const department = await this.departments.findOne({ where: { id: employee.departmentId } });
    return this.assigneeFromStaffId(department?.managerStaffId);
  }

  private async assigneeFromStaffId (staffId?: string) {
    if (!staffId) return null;
    const staff = await this.staff.findOne({ where: { id: staffId } });
    if (!staff) return null;
    return { staffId: staff.id, userId: staff.userId };
  }

  private async roleAssignees (roleKey?: string) {
    const key = String(roleKey || 'ADMIN').trim().toUpperCase();
    const users = await this.users.find({ where: { role: key } });
    const assignments = await this.branchAssignments.find();
    const assignmentUserIds = assignments
      .filter((assignment) => assignment.isActive && (assignment.roleKeys || []).map((item) => String(item).toUpperCase()).includes(key))
      .map((assignment) => assignment.userId)
      .filter(Boolean) as string[];
    return Array.from(new Set([...users.map((user) => user.id), ...assignmentUserIds]))
      .filter(Boolean)
      .map((userId) => ({ userId }));
  }

  private async findActionableTask (instanceId: string, user: AuthUser) {
    const instance = await this.instances.findOne({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow không tồn tại');
    if (instance.status !== 'pending') throw new BadRequestException('Workflow không còn ở trạng thái chờ duyệt');
    const tasks = await this.tasks.find({ where: { instanceId, status: 'pending' } });
    const task = tasks.find((item) =>
      item.assigneeUserId === user.id ||
      Boolean(item.assigneeStaffId && user.staffId && item.assigneeStaffId === user.staffId),
    );
    if (!task) throw new ForbiddenException('Bạn không phải người duyệt ở bước hiện tại');
    return { instance, task };
  }

  private canSeeInstance (instance: WorkflowInstance, tasks: WorkflowTask[], user: AuthUser) {
    if (user.role === 'ADMIN') return true;
    if (instance.requesterUserId === user.id || instance.requesterStaffId === user.staffId) return true;
    return tasks.some((task) => task.assigneeUserId === user.id || (task.assigneeStaffId && task.assigneeStaffId === user.staffId));
  }

  private async applyFinalStatus (instance: WorkflowInstance, status: 'approved' | 'rejected' | 'cancelled', user: AuthUser) {
    const repo = this.targetRepository(instance.targetResource);
    const record = await repo.findOne({ where: { id: instance.targetRecordId } });
    if (!record) return;
    const definition = await this.definitions.findOne({ where: { id: instance.definitionId } });
    const finalStatus = this.resolveFinalStatus(definition, status);
    const patch: Record<string, unknown> = {
      ...record,
      status: finalStatus,
    };
    if (status === 'approved') {
      patch.approvedById = user.staffId || user.id;
    }
    if (status === 'approved' && instance.targetResource === 'software-license-assignments' && finalStatus === 'ACTIVE') {
      await this.assertSoftwareLicenseSeatAvailable(record as SoftwareLicenseAssignment);
    }
    await repo.save(patch);
    if (status === 'approved' && instance.targetResource === 'attendance-adjustment-requests') {
      await this.applyAttendanceAdjustment(record as AttendanceAdjustmentRequest);
    }
  }

  private async applyStepStatus (instance: WorkflowInstance, step: WorkflowStep) {
    const stepStatus = String(step.stateKey || '').trim();
    if (!stepStatus) return;
    const repo = this.targetRepository(instance.targetResource);
    const record = await repo.findOne({ where: { id: instance.targetRecordId } });
    if (!record) return;
    await repo.save({
      ...record,
      status: stepStatus,
    });
  }

  private normalizeStatusList (value?: string[]) {
    const statuses = Array.isArray(value) ? value : [];
    const normalized = statuses.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
    return normalized.length > 0 ? normalized : ['pending', 'submitted'];
  }

  private resolveFinalStatus (definition: WorkflowDefinition | null, status: 'approved' | 'rejected' | 'cancelled') {
    if (status === 'approved') return String(definition?.approvedStatus || 'approved').trim() || 'approved';
    if (status === 'rejected') return String(definition?.rejectedStatus || 'rejected').trim() || 'rejected';
    return String(definition?.cancelledStatus || 'cancelled').trim() || 'cancelled';
  }

  private async applyAttendanceAdjustment (request: AttendanceAdjustmentRequest) {
    const attendance = request.attendanceId
      ? await this.attendances.findOne({ where: { id: request.attendanceId } })
      : await this.attendances.findOne({ where: { staffId: request.staffId, date: request.date } });
    const payload = {
      ...(attendance || {}),
      staffId: request.staffId,
      branchId: request.branchId || attendance?.branchId,
      date: request.date,
      checkIn: request.requestedCheckIn || attendance?.checkIn,
      checkOut: request.requestedCheckOut || attendance?.checkOut,
      status: attendance?.status || 'present',
      note: [attendance?.note, `Điều chỉnh theo đơn ${request.id}`].filter(Boolean).join('\n'),
    };
    await this.attendances.save(this.attendances.create(payload));
  }

  private targetRepository (resource: string): Repository<any> {
    const map: Record<string, Repository<any>> = {
      'leave-requests': this.leaveRequests,
      'attendance-adjustment-requests': this.attendanceAdjustments,
      'business-trip-requests': this.businessTrips,
      'payment-requests': this.paymentRequests,
      'software-license-assignments': this.softwareLicenseAssignments,
    };
    const repo = map[resource];
    if (!repo) throw new BadRequestException('Loại đơn chưa hỗ trợ workflow');
    return repo;
  }

  private async assertSoftwareLicenseSeatAvailable(assignment: SoftwareLicenseAssignment) {
    const license = await this.softwareLicenses.findOne({ where: { id: assignment.softwareLicenseId, isArchived: false } });
    if (!license || license.status !== 'ACTIVE') {
      throw new BadRequestException('Gói bản quyền không tồn tại hoặc không còn hoạt động');
    }
    const usedSeats = await this.softwareLicenseAssignments.count({
      where: { softwareLicenseId: license.id, status: 'ACTIVE', isArchived: false },
    });
    if (usedSeats >= license.seatCount) {
      throw new BadRequestException(`Gói bản quyền đã hết seat (${usedSeats}/${license.seatCount}). Không thể hoàn tất phê duyệt.`);
    }
  }

  private async loadTargetRecords (instances: WorkflowInstance[]) {
    const map = new Map<string, TargetRecord | null>();
    await Promise.all(instances.map(async (instance) => {
      map.set(`${instance.targetResource}:${instance.targetRecordId}`, await this.loadTargetRecord(instance.targetResource, instance.targetRecordId));
    }));
    return map;
  }

  private async loadTargetRecord (resource: string, id: string): Promise<TargetRecord> {
    const record = await this.targetRepository(resource).findOne({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy chứng từ cần duyệt');
    return record;
  }
}
