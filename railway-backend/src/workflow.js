import { query } from "./db.js";

function parseJson(value, fallback) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapApprovalRequestRow(row) {
  return {
    id: row.id,
    requestType: row.request_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    requestStatus: row.request_status,
    requestedByEmployeeId: row.requested_by_employee_id,
    requestedByEmployeeName: row.requested_by_employee_name,
    requestedByEmployeeRole: row.requested_by_employee_role,
    assignedApproverEmployeeId: row.assigned_approver_employee_id,
    assignedApproverEmployeeName: row.assigned_approver_employee_name,
    effectiveFromDate: row.effective_from_date,
    effectiveToDate: row.effective_to_date,
    reason: row.reason,
    remarks: row.remarks,
    beforeData: parseJson(row.before_data, {}),
    requestedData: parseJson(row.requested_data, {}),
    reviewedData: parseJson(row.reviewed_data, {}),
    metadata: parseJson(row.metadata, {}),
    reviewedByEmployeeId: row.reviewed_by_employee_id,
    reviewedByEmployeeName: row.reviewed_by_employee_name,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTimelineEventRow(row) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    eventType: row.event_type,
    title: row.title,
    summary: row.summary,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorIdentifier: row.actor_identifier,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    beforeData: parseJson(row.before_data, {}),
    afterData: parseJson(row.after_data, {}),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
  };
}

function mapSavedViewRow(row) {
  return {
    id: row.id,
    moduleKey: row.module_key,
    viewKey: row.view_key,
    viewName: row.view_name,
    ownerType: row.owner_type,
    ownerEmployeeId: row.owner_employee_id,
    ownerEmployeeName: row.owner_employee_name,
    roleKey: row.role_key,
    isShared: Boolean(row.is_shared),
    filters: parseJson(row.filters, {}),
    columns: parseJson(row.columns_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSlaRuleRow(row) {
  return {
    id: row.id,
    ruleKey: row.rule_key,
    label: row.label,
    description: row.description,
    entityType: row.entity_type,
    thresholdDays: Number(row.threshold_days ?? 0),
    severity: row.severity,
    isActive: Boolean(row.is_active),
    escalationTarget: row.escalation_target,
    metadata: parseJson(row.metadata, {}),
    updatedAt: row.updated_at,
  };
}

async function upsertNotification(payload) {
  const values = [
    payload.notificationKey || null,
    payload.title,
    payload.message,
    payload.category || "general",
    payload.severity || "info",
    payload.targetType || "all",
    payload.targetEmployeeId || null,
    JSON.stringify(payload.deliveryChannels || []),
    Boolean(payload.isRead),
    payload.actionUrl || null,
    payload.entityType || null,
    payload.entityId || null,
    JSON.stringify(payload.metadata || {}),
  ];

  if (payload.notificationKey) {
    const updated = await query(
      `update notification_logs
          set title = $2,
              message = $3,
              category = $4,
              severity = $5,
              target_type = $6,
              target_employee_id = $7,
              delivery_channels = $8::jsonb,
              is_read = $9::boolean,
              action_url = $10,
              entity_type = $11,
              entity_id = $12,
              metadata = $13::jsonb,
              updated_at = now()
        where notification_key = $1
        returning id`,
      values
    );

    if (updated.rows[0]) {
      return;
    }
  }

  await query(
    `insert into notification_logs (
      notification_key,
      title,
      message,
      category,
      severity,
      target_type,
      target_employee_id,
      delivery_channels,
      is_read,
      action_url,
      entity_type,
      entity_id,
      metadata,
      created_at,
      updated_at
    ) values (
      $1::text,
      $2::text,
      $3::text,
      $4::text,
      $5::text,
      $6::text,
      $7::uuid,
      $8::jsonb,
      $9::boolean,
      $10::text,
      $11::text,
      $12::text,
      $13::jsonb,
      now(),
      now()
    )`,
    values
  );
}

export async function ensureWorkflowSchema() {
  await query(`
    create table if not exists crm_approval_requests (
      id uuid primary key default gen_random_uuid(),
      request_type text not null,
      entity_type text not null,
      entity_id text not null,
      entity_label text,
      request_status text not null default 'pending',
      requested_by_employee_id uuid references employees(id) on delete set null,
      assigned_approver_employee_id uuid references employees(id) on delete set null,
      effective_from_date date,
      effective_to_date date,
      reason text,
      remarks text,
      before_data jsonb not null default '{}'::jsonb,
      requested_data jsonb not null default '{}'::jsonb,
      reviewed_data jsonb not null default '{}'::jsonb,
      metadata jsonb not null default '{}'::jsonb,
      reviewed_by_employee_id uuid references employees(id) on delete set null,
      reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(
    `create index if not exists idx_crm_approval_requests_entity on crm_approval_requests(entity_type, entity_id, created_at desc)`
  );
  await query(
    `create index if not exists idx_crm_approval_requests_status on crm_approval_requests(request_status, created_at desc)`
  );

  await query(`
    create table if not exists crm_timeline_events (
      id uuid primary key default gen_random_uuid(),
      entity_type text not null,
      entity_id text not null,
      entity_label text,
      event_type text not null,
      title text not null,
      summary text,
      actor_type text not null default 'internal-user',
      actor_id uuid,
      actor_identifier text,
      actor_name text,
      actor_role text,
      before_data jsonb not null default '{}'::jsonb,
      after_data jsonb not null default '{}'::jsonb,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(
    `create index if not exists idx_crm_timeline_events_entity on crm_timeline_events(entity_type, entity_id, created_at desc)`
  );
  await query(
    `create index if not exists idx_crm_timeline_events_actor on crm_timeline_events(actor_id, created_at desc)`
  );

  await query(`
    create table if not exists crm_saved_views (
      id uuid primary key default gen_random_uuid(),
      module_key text not null,
      view_key text not null,
      view_name text not null,
      owner_type text not null default 'employee',
      owner_employee_id uuid references employees(id) on delete cascade,
      role_key text,
      is_shared boolean not null default false,
      filters jsonb not null default '{}'::jsonb,
      columns_json jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(
    `create index if not exists idx_crm_saved_views_owner on crm_saved_views(owner_type, owner_employee_id, module_key, updated_at desc)`
  );

  await query(`
    create table if not exists crm_sla_rules (
      id uuid primary key default gen_random_uuid(),
      rule_key text not null unique,
      label text not null,
      description text,
      entity_type text not null,
      threshold_days integer not null default 0,
      severity text not null default 'warning',
      is_active boolean not null default true,
      escalation_target text not null default 'admin',
      metadata jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `);

  await query(`alter table notification_logs add column if not exists notification_key text`);
  await query(`alter table notification_logs add column if not exists action_url text`);
  await query(`alter table notification_logs add column if not exists entity_type text`);
  await query(`alter table notification_logs add column if not exists entity_id text`);
  await query(`alter table notification_logs add column if not exists metadata jsonb not null default '{}'::jsonb`);
  await query(`alter table notification_logs add column if not exists read_at timestamptz`);
  await query(`alter table notification_logs add column if not exists updated_at timestamptz not null default now()`);
  await query(
    `create unique index if not exists idx_notification_logs_notification_key on notification_logs(notification_key) where notification_key is not null`
  );

  await query(
    `insert into crm_sla_rules (
      rule_key,
      label,
      description,
      entity_type,
      threshold_days,
      severity,
      is_active,
      escalation_target,
      metadata,
      updated_at
    ) values
      ('client-follow-up-overdue', 'Client follow-up overdue', 'Escalate when client follow-up date is overdue.', 'client', 2, 'warning', true, 'owner', '{}'::jsonb, now()),
      ('candidate-stage-stalled', 'Candidate stuck in stage', 'Escalate when a candidate remains in the same stage too long.', 'candidate', 5, 'warning', true, 'owner', '{}'::jsonb, now()),
      ('job-without-applications', 'Job without applicants', 'Escalate when an open job has no applicants for too long.', 'job', 10, 'critical', true, 'owner', '{}'::jsonb, now()),
      ('approval-request-pending', 'Pending approval request', 'Escalate when approval requests stay pending.', 'approval-request', 2, 'warning', true, 'admin', '{}'::jsonb, now())
    on conflict (rule_key) do nothing`
  );
}

export async function createTimelineEvent(payload) {
  const result = await query(
    `insert into crm_timeline_events (
      entity_type,
      entity_id,
      entity_label,
      event_type,
      title,
      summary,
      actor_type,
      actor_id,
      actor_identifier,
      actor_name,
      actor_role,
      before_data,
      after_data,
      metadata
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb
    )
    returning *`,
    [
      payload.entityType,
      payload.entityId,
      payload.entityLabel || null,
      payload.eventType,
      payload.title,
      payload.summary || null,
      payload.actorType || "internal-user",
      payload.actorId || null,
      payload.actorIdentifier || null,
      payload.actorName || null,
      payload.actorRole || null,
      JSON.stringify(payload.beforeData || {}),
      JSON.stringify(payload.afterData || {}),
      JSON.stringify(payload.metadata || {}),
    ]
  );

  return mapTimelineEventRow(result.rows[0]);
}

export async function listTimelineEvents(filters = {}) {
  const values = [];
  const whereClauses = [];

  if (filters.entityType) {
    values.push(filters.entityType);
    whereClauses.push(`entity_type = $${values.length}`);
  }
  if (filters.entityId) {
    values.push(filters.entityId);
    whereClauses.push(`entity_id = $${values.length}`);
  }
  if (filters.actorId) {
    values.push(filters.actorId);
    whereClauses.push(`actor_id = $${values.length}`);
  }

  const whereClause = whereClauses.length ? `where ${whereClauses.join(" and ")}` : "";
  values.push(Math.max(1, Math.min(Number(filters.limit ?? 100), 250)));

  const result = await query(
    `select *
     from crm_timeline_events
     ${whereClause}
     order by created_at desc
     limit $${values.length}`,
    values
  );

  return result.rows.map(mapTimelineEventRow);
}

export async function createApprovalRequest(payload) {
  const result = await query(
    `insert into crm_approval_requests (
      request_type,
      entity_type,
      entity_id,
      entity_label,
      request_status,
      requested_by_employee_id,
      assigned_approver_employee_id,
      effective_from_date,
      effective_to_date,
      reason,
      remarks,
      before_data,
      requested_data,
      reviewed_data,
      metadata
    ) values (
      $1, $2, $3, $4, 'pending', $5, $6, $7::date, $8::date, $9, $10, $11::jsonb, $12::jsonb, '{}'::jsonb, $13::jsonb
    )
    returning *`,
    [
      payload.requestType,
      payload.entityType,
      payload.entityId,
      payload.entityLabel || null,
      payload.requestedByEmployeeId || null,
      payload.assignedApproverEmployeeId || null,
      payload.effectiveFromDate || null,
      payload.effectiveToDate || null,
      payload.reason || null,
      payload.remarks || null,
      JSON.stringify(payload.beforeData || {}),
      JSON.stringify(payload.requestedData || {}),
      JSON.stringify(payload.metadata || {}),
    ]
  );

  const created = result.rows[0];
  const hydrated = await query(
    `select
      requests.*,
      requested_by.full_name as requested_by_employee_name,
      requested_by.role as requested_by_employee_role,
      approver.full_name as assigned_approver_employee_name,
      reviewer.full_name as reviewed_by_employee_name
     from crm_approval_requests requests
     left join employees requested_by on requested_by.id = requests.requested_by_employee_id
     left join employees approver on approver.id = requests.assigned_approver_employee_id
     left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
     where requests.id = $1`,
    [created.id]
  );

  return mapApprovalRequestRow(hydrated.rows[0]);
}

export async function listApprovalRequests(filters = {}) {
  const values = [];
  const whereClauses = [];

  if (filters.requestStatus) {
    values.push(filters.requestStatus);
    whereClauses.push(`requests.request_status = $${values.length}`);
  }
  if (filters.requestType) {
    values.push(filters.requestType);
    whereClauses.push(`requests.request_type = $${values.length}`);
  }
  if (filters.entityType) {
    values.push(filters.entityType);
    whereClauses.push(`requests.entity_type = $${values.length}`);
  }
  if (filters.employeeId && !filters.isAdmin) {
    values.push(filters.employeeId);
    whereClauses.push(
      `(requests.requested_by_employee_id = $${values.length} or requests.assigned_approver_employee_id = $${values.length})`
    );
  }

  const whereClause = whereClauses.length ? `where ${whereClauses.join(" and ")}` : "";
  const result = await query(
    `select
      requests.*,
      requested_by.full_name as requested_by_employee_name,
      requested_by.role as requested_by_employee_role,
      approver.full_name as assigned_approver_employee_name,
      reviewer.full_name as reviewed_by_employee_name
     from crm_approval_requests requests
     left join employees requested_by on requested_by.id = requests.requested_by_employee_id
     left join employees approver on approver.id = requests.assigned_approver_employee_id
     left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
     ${whereClause}
     order by requests.created_at desc`,
    values
  );

  return result.rows.map(mapApprovalRequestRow);
}

export async function reviewApprovalRequest(id, payload) {
  const result = await query(
    `update crm_approval_requests
        set request_status = $2,
            reviewed_data = $3::jsonb,
            reviewed_by_employee_id = $4,
            reviewed_at = now(),
            updated_at = now()
      where id = $1
        and request_status = 'pending'
      returning *`,
    [
      id,
      payload.requestStatus,
      JSON.stringify(payload.reviewedData || {}),
      payload.reviewedByEmployeeId || null,
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  const hydrated = await query(
    `select
      requests.*,
      requested_by.full_name as requested_by_employee_name,
      requested_by.role as requested_by_employee_role,
      approver.full_name as assigned_approver_employee_name,
      reviewer.full_name as reviewed_by_employee_name
     from crm_approval_requests requests
     left join employees requested_by on requested_by.id = requests.requested_by_employee_id
     left join employees approver on approver.id = requests.assigned_approver_employee_id
     left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
     where requests.id = $1`,
    [id]
  );

  return mapApprovalRequestRow(hydrated.rows[0]);
}

export async function reviewPendingApprovalByEntity(entityType, entityId, requestType, payload) {
  const existing = await query(
    `select id
     from crm_approval_requests
     where entity_type = $1
       and entity_id = $2
       and request_type = $3
       and request_status = 'pending'
     order by created_at desc
     limit 1`,
    [entityType, entityId, requestType]
  );

  if (!existing.rows[0]) {
    return null;
  }

  return reviewApprovalRequest(existing.rows[0].id, payload);
}

export async function listSavedViews(filters = {}) {
  const values = [];
  const whereClauses = [];

  if (filters.moduleKey) {
    values.push(filters.moduleKey);
    whereClauses.push(`views.module_key = $${values.length}`);
  }
  if (filters.ownerEmployeeId && !filters.isAdmin) {
    values.push(filters.ownerEmployeeId);
    whereClauses.push(
      `(views.owner_employee_id = $${values.length} or views.is_shared = true)`
    );
  }
  if (filters.ownerEmployeeId && filters.isAdmin && !filters.includeAll) {
    values.push(filters.ownerEmployeeId);
    whereClauses.push(`(views.owner_employee_id = $${values.length} or views.is_shared = true)`);
  }

  const whereClause = whereClauses.length ? `where ${whereClauses.join(" and ")}` : "";
  const result = await query(
    `select
      views.*,
      employees.full_name as owner_employee_name
     from crm_saved_views views
     left join employees on employees.id = views.owner_employee_id
     ${whereClause}
     order by views.is_shared desc, views.updated_at desc`,
    values
  );

  return result.rows.map(mapSavedViewRow);
}

export async function upsertSavedView(payload) {
  if (payload.id) {
    const updated = await query(
      `update crm_saved_views
          set module_key = $2,
              view_key = $3,
              view_name = $4,
              owner_type = $5,
              owner_employee_id = $6,
              role_key = $7,
              is_shared = $8,
              filters = $9::jsonb,
              columns_json = $10::jsonb,
              updated_at = now()
        where id = $1
        returning *`,
      [
        payload.id,
        payload.moduleKey,
        payload.viewKey,
        payload.viewName,
        payload.ownerType || "employee",
        payload.ownerEmployeeId || null,
        payload.roleKey || null,
        Boolean(payload.isShared),
        JSON.stringify(payload.filters || {}),
        JSON.stringify(payload.columns || []),
      ]
    );

    if (!updated.rows[0]) {
      return null;
    }

    const hydrated = await query(
      `select
        views.*,
        employees.full_name as owner_employee_name
       from crm_saved_views views
       left join employees on employees.id = views.owner_employee_id
       where views.id = $1`,
      [payload.id]
    );

    return mapSavedViewRow(hydrated.rows[0]);
  }

  const inserted = await query(
    `insert into crm_saved_views (
      module_key,
      view_key,
      view_name,
      owner_type,
      owner_employee_id,
      role_key,
      is_shared,
      filters,
      columns_json
    ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
    returning *`,
    [
      payload.moduleKey,
      payload.viewKey,
      payload.viewName,
      payload.ownerType || "employee",
      payload.ownerEmployeeId || null,
      payload.roleKey || null,
      Boolean(payload.isShared),
      JSON.stringify(payload.filters || {}),
      JSON.stringify(payload.columns || []),
    ]
  );

  const hydrated = await query(
    `select
      views.*,
      employees.full_name as owner_employee_name
     from crm_saved_views views
     left join employees on employees.id = views.owner_employee_id
     where views.id = $1`,
    [inserted.rows[0].id]
  );

  return mapSavedViewRow(hydrated.rows[0]);
}

export async function deleteSavedView(id, ownerEmployeeId = null, isAdmin = false) {
  const values = [id];
  let whereClause = `where id = $1`;

  if (ownerEmployeeId && !isAdmin) {
    values.push(ownerEmployeeId);
    whereClause += ` and owner_employee_id = $2`;
  }

  const result = await query(
    `delete from crm_saved_views
     ${whereClause}
     returning id`,
    values
  );

  return Boolean(result.rows[0]);
}

export async function listSlaRules() {
  const result = await query(
    `select *
     from crm_sla_rules
     order by label asc`
  );

  return result.rows.map(mapSlaRuleRow);
}

export async function updateSlaRules(rules = []) {
  const updates = [];

  for (const rule of rules) {
    const normalizedRule = {
      ruleKey: String(rule.ruleKey || ""),
      label: String(rule.label || "").trim(),
      description:
        typeof rule.description === "string" && rule.description.trim().length > 0
          ? rule.description.trim()
          : null,
      thresholdDays: Number(rule.thresholdDays ?? 0),
      severity: String(rule.severity || "warning"),
      isActive: Boolean(rule.isActive),
      escalationTarget: String(rule.escalationTarget || "admin"),
      metadata:
        rule.metadata && typeof rule.metadata === "object" && !Array.isArray(rule.metadata)
          ? rule.metadata
          : {},
    };

    const result = await query(
      `update crm_sla_rules
          set label = $2::text,
              description = $3::text,
              threshold_days = $4::integer,
              severity = $5::text,
              is_active = $6::boolean,
              escalation_target = $7::text,
              metadata = coalesce($8::jsonb, '{}'::jsonb),
              updated_at = now()
        where rule_key = $1::text
        returning *`,
      [
        normalizedRule.ruleKey,
        normalizedRule.label,
        normalizedRule.description,
        Number.isFinite(normalizedRule.thresholdDays) ? normalizedRule.thresholdDays : 0,
        normalizedRule.severity,
        normalizedRule.isActive,
        normalizedRule.escalationTarget,
        JSON.stringify(normalizedRule.metadata),
      ]
    );

    if (result.rows[0]) {
      updates.push(mapSlaRuleRow(result.rows[0]));
    }
  }

  return updates;
}

export async function runSlaEscalations() {
  const rules = await listSlaRules();
  const activeRules = new Map(rules.filter((rule) => rule.isActive).map((rule) => [rule.ruleKey, rule]));

  const clientRule = activeRules.get("client-follow-up-overdue");
  if (clientRule) {
    const clientRows = await query(
      `select
        clients.id,
        clients.company_name,
        clients.next_follow_up_date,
        coalesce(clients.follow_up_employee_id, clients.assigned_employee_id) as owner_employee_id
       from clients
       where clients.next_follow_up_date is not null
         and coalesce(clients.follow_up_status, 'awaiting-response') not in ('closed', 'on-boarded')
         and clients.next_follow_up_date < current_date - ($1::text || ' days')::interval`,
      [clientRule.thresholdDays]
    );

    const activeClientOverdueKeys = clientRows.rows.map(
      (row) => `sla-client-follow-up-overdue-${row.id}`
    );
    await query(
      `update notification_logs
          set is_read = true,
              read_at = coalesce(read_at, now()),
              updated_at = now()
        where notification_key like 'sla-client-follow-up-overdue-%'
          and is_read = false
          and not (notification_key = any($1::text[]))`,
      [activeClientOverdueKeys]
    );

    for (const row of clientRows.rows) {
      await upsertNotification({
        notificationKey: `sla-client-follow-up-overdue-${row.id}`,
        title: `${row.company_name}: follow-up overdue`,
        message: `Client follow-up is overdue since ${row.next_follow_up_date}.`,
        category: "sla",
        severity: clientRule.severity,
        targetType: row.owner_employee_id ? "employee" : "all",
        targetEmployeeId: row.owner_employee_id,
        actionUrl: `/admin/clients/${row.id}`,
        entityType: "client",
        entityId: row.id,
        metadata: {
          ruleKey: clientRule.ruleKey,
          thresholdDays: clientRule.thresholdDays,
        },
      });
    }
  }

  const candidateRule = activeRules.get("candidate-stage-stalled");
  if (candidateRule) {
    const candidateRows = await query(
      `select
        applications.id,
        applications.candidate_name,
        applications.stage,
        applications.stage_updated_at,
        coalesce(applications.follow_up_employee_id, applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id) as owner_employee_id
       from job_applications applications
       left join jobs on jobs.id = applications.job_id
       left join clients on clients.id = jobs.client_id
       where applications.stage_updated_at is not null
         and applications.stage in ('applied', 'shortlisted', 'interview', 'offered')
         and applications.stage_updated_at < now() - ($1::text || ' days')::interval`,
      [candidateRule.thresholdDays]
    );

    for (const row of candidateRows.rows) {
      await upsertNotification({
        notificationKey: `sla-candidate-stage-stalled-${row.id}`,
        title: `${row.candidate_name}: stage not moved`,
        message: `Candidate is still in ${row.stage} after ${candidateRule.thresholdDays} days.`,
        category: "sla",
        severity: candidateRule.severity,
        targetType: row.owner_employee_id ? "employee" : "all",
        targetEmployeeId: row.owner_employee_id,
        actionUrl: `/admin/candidates/${row.id}`,
        entityType: "candidate",
        entityId: row.id,
        metadata: {
          ruleKey: candidateRule.ruleKey,
          stage: row.stage,
        },
      });
    }
  }

  const jobRule = activeRules.get("job-without-applications");
  if (jobRule) {
    const jobRows = await query(
      `select
        jobs.id,
        jobs.job_code,
        jobs.title,
        jobs.posted_at,
        jobs.assigned_employee_id
       from jobs
       where jobs.status = 'open'
         and coalesce(jobs.applications_count, 0) = 0
         and jobs.posted_at is not null
         and jobs.posted_at < current_date - ($1::text || ' days')::interval`,
      [jobRule.thresholdDays]
    );

    for (const row of jobRows.rows) {
      await upsertNotification({
        notificationKey: `sla-job-without-applications-${row.id}`,
        title: `${row.title}: no applicants yet`,
        message: `Open job ${row.job_code || row.title} has no applicants after ${jobRule.thresholdDays} days.`,
        category: "sla",
        severity: jobRule.severity,
        targetType: row.assigned_employee_id ? "employee" : "all",
        targetEmployeeId: row.assigned_employee_id,
        actionUrl: `/admin/jobs/${row.id}`,
        entityType: "job",
        entityId: row.id,
        metadata: {
          ruleKey: jobRule.ruleKey,
        },
      });
    }
  }

  const approvalRule = activeRules.get("approval-request-pending");
  if (approvalRule) {
    const approvalRows = await query(
      `select
        requests.id,
        requests.request_type,
        requests.entity_type,
        requests.entity_id,
        requests.entity_label,
        requests.assigned_approver_employee_id
       from crm_approval_requests requests
       where requests.request_status = 'pending'
         and requests.created_at < now() - ($1::text || ' days')::interval`,
      [approvalRule.thresholdDays]
    );

    for (const row of approvalRows.rows) {
      await upsertNotification({
        notificationKey: `sla-approval-request-pending-${row.id}`,
        title: `${row.entity_label || row.request_type}: approval pending`,
        message: `Approval request is still pending after ${approvalRule.thresholdDays} days.`,
        category: "approval",
        severity: approvalRule.severity,
        targetType: row.assigned_approver_employee_id ? "employee" : "all",
        targetEmployeeId: row.assigned_approver_employee_id,
        actionUrl: `/admin/settings/workflows`,
        entityType: "approval-request",
        entityId: row.id,
        metadata: {
          ruleKey: approvalRule.ruleKey,
          requestType: row.request_type,
          sourceEntityType: row.entity_type,
          sourceEntityId: row.entity_id,
        },
      });
    }
  }

  return true;
}
