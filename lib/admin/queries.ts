import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin/auth"
import { logSafeServerError } from "@/lib/security/safe-error"
import type {
  AdminCourse,
  AdminGoal,
  AdminGoalItem,
  AdminMaterial,
  AdminStudent,
  AdminCourseStudent,
  AdminSubject,
  AdminSyllabusTopic,
  HotmartProductMapping,
  HotmartEventSummary,
} from "@/lib/admin/types"

export async function listAdminCourses(): Promise<AdminCourse[]> {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  if (!courses) return []

  const { data: enrollmentCounts } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("status", "active")

  const { data: goalCounts } = await supabase.from("goals").select("course_id")

  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    slug: course.slug,
    organization: course.organization,
    description: course.description,
    coverColor: course.cover_color,
    status: course.status,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    groupsEnabled: course.groups_enabled ?? false,
    questionnaireSchema: course.questionnaire_schema ?? [],
    studentsCount:
      enrollmentCounts?.filter(
        (enrollment) => enrollment.course_id === course.id,
      ).length ?? 0,
    goalsCount:
      goalCounts?.filter((g) => g.course_id === course.id).length ?? 0,
  }))
}

export async function countActiveStudents(): Promise<number> {
  const supabase = await createClient()
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id")
    .eq("status", "active")

  return new Set((enrollments ?? []).map((enrollment) => enrollment.user_id))
    .size
}

export async function getAdminCourse(
  courseId: string,
): Promise<AdminCourse | null> {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single()
  if (!course) return null

  const { count: studentsCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("status", "active")

  const { count: goalsCount } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)

  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    organization: course.organization,
    description: course.description,
    coverColor: course.cover_color,
    status: course.status,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    groupsEnabled: course.groups_enabled ?? false,
    questionnaireSchema: course.questionnaire_schema ?? [],
    studentsCount: studentsCount ?? 0,
    goalsCount: goalsCount ?? 0,
  }
}

export async function listCourseSubjects(
  courseId: string,
): Promise<AdminSubject[]> {
  const supabase = await createClient()

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*, syllabus_topics(id)")
    .eq("course_id", courseId)
    .order("position", { ascending: true })

  if (!subjects) return []

  return subjects.map((subject: any) => ({
    id: subject.id,
    courseId: subject.course_id,
    name: subject.name,
    position: subject.position,
    topicsCount: subject.syllabus_topics?.length ?? 0,
  }))
}

export async function listSubjectTopics(
  subjectId: string,
): Promise<AdminSyllabusTopic[]> {
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from("syllabus_topics")
    .select("*")
    .eq("subject_id", subjectId)
    .order("position", { ascending: true })

  return (topics ?? []).map((topic) => ({
    id: topic.id,
    subjectId: topic.subject_id,
    parentTopicId: topic.parent_topic_id ?? null,
    title: topic.title,
    position: topic.position,
    importance: topic.importance ?? null,
  }))
}

export async function listCourseEdital(
  courseId: string,
): Promise<{ subject: AdminSubject; topics: AdminSyllabusTopic[] }[]> {
  const subjects = await listCourseSubjects(courseId)
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from("syllabus_topics")
    .select("*")
    .in(
      "subject_id",
      subjects.map((s) => s.id).length
        ? subjects.map((s) => s.id)
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("position", { ascending: true })

  return subjects.map((subject) => ({
    subject,
    topics: (topics ?? [])
      .filter((t) => t.subject_id === subject.id)
      .map((t) => ({
        id: t.id,
        subjectId: t.subject_id,
        parentTopicId: t.parent_topic_id ?? null,
        title: t.title,
        position: t.position,
        importance: t.importance ?? null,
      })),
  }))
}

export async function listMaterials(
  courseId?: string,
): Promise<AdminMaterial[]> {
  const supabase = await createClient()

  let query = supabase
    .from("materials")
    .select("*")
    .order("created_at", { ascending: false })
  if (courseId) query = query.eq("course_id", courseId)

  const { data: materials } = await query

  return (materials ?? []).map((material) => ({
    id: material.id,
    courseId: material.course_id,
    subjectId: material.subject_id,
    title: material.title,
    type: material.type,
    url: material.url,
    description: material.description,
    createdAt: material.created_at,
  }))
}

const GOAL_WITH_ITEMS = "*, goal_items(*, goal_item_materials(material_id, position))"

// Uma única consulta traz metas, itens e materiais; antes eram 1 + N consultas.
export async function listCourseGoals(courseId: string): Promise<AdminGoal[]> {
  const supabase = await createClient()

  const { data: goals } = await supabase
    .from("goals")
    .select(GOAL_WITH_ITEMS)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })

  return (goals ?? []).map(mapGoalRow)
}

export async function getAdminGoal(goalId: string): Promise<AdminGoal | null> {
  const supabase = await createClient()

  const { data: goal } = await supabase
    .from("goals")
    .select(GOAL_WITH_ITEMS)
    .eq("id", goalId)
    .single()
  if (!goal) return null

  return mapGoalRow(goal)
}

function mapGoalRow(goal: any): AdminGoal {
  const goalItems: AdminGoalItem[] = (goal.goal_items ?? [])
    .filter((item: any) => item.archived_at == null)
    .sort((a: any, b: any) => a.position - b.position)
    .map((item: any) => ({
      id: item.id,
      subjectId: item.subject_id,
      topicId: item.topic_id,
      subtopicId: item.subtopic_id ?? null,
      instructions: item.instructions,
      suggestedQuestions: item.suggested_questions,
      position: item.position,
      materialIds: (item.goal_item_materials ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((m: any) => m.material_id),
    }))

  return {
    id: goal.id,
    courseId: goal.course_id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    dueDate: goal.due_date,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    targetGroups: goal.target_groups ?? [1, 2],
    items: goalItems,
  }
}

/**
 * Quais contas nunca concluíram um login (convite/acesso não usado). Só o
 * administrador consulta; o dado vem do Auth com a chave de serviço e nunca
 * vai ao navegador além do booleano. Falha na consulta não derruba a página.
 */
async function getNeverSignedInIds(userIds: string[]): Promise<Set<string> | null> {
  if (userIds.length === 0) return new Set()
  try {
    await requireAdmin()
    const wanted = new Set(userIds)
    const never = new Set<string>()
    const admin = createAdminClient()
    const perPage = 1000
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      for (const user of data.users) {
        if (wanted.has(user.id) && !user.last_sign_in_at) never.add(user.id)
      }
      if (data.users.length < perPage) break
    }
    return never
  } catch (error) {
    logSafeServerError("admin.students.sign_in_status_failed", error)
    return null
  }
}

export async function listCourseStudents(
  courseId: string,
): Promise<AdminCourseStudent[]> {
  const supabase = await createClient()

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(
      "id, user_id, course_id, status, enrolled_at, study_group, mirror_group, group_manual_override, questionnaire, profiles!enrollments_user_id_fkey(full_name, avatar_initials)",
    )
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false })

  const [manual, rights, blocks] = await Promise.all([
    supabase
      .from("manual_course_grants")
      .select("user_id, status")
      .eq("course_id", courseId),
    supabase
      .from("hotmart_entitlements")
      .select("user_id, status")
      .eq("course_id", courseId),
    supabase
      .from("course_access_blocks")
      .select(
        "user_id, reason, blocked_at, profiles!course_access_blocks_blocked_by_fkey(full_name)",
      )
      .eq("course_id", courseId)
      .is("released_at", null),
  ])
  if (enrollmentError || manual.error || rights.error || blocks.error) {
    throw new Error(
      "Não foi possível consultar os acessos. Confira a migration de bloqueios administrativos.",
    )
  }
  const neverSignedIn = await getNeverSignedInIds((enrollments ?? []).map((row: any) => row.user_id))

  return (enrollments ?? []).map((enrollment: any) => {
    const profile = Array.isArray(enrollment.profiles)
      ? enrollment.profiles[0]
      : enrollment.profiles
    const block = blocks.data?.find((row) => row.user_id === enrollment.user_id)
    const actor = Array.isArray(block?.profiles)
      ? block.profiles[0]
      : block?.profiles
    const purchases =
      rights.data?.filter((row) => row.user_id === enrollment.user_id) ?? []

    return {
      id: enrollment.id,
      userId: enrollment.user_id,
      fullName: profile?.full_name || "Aluno",
      email: "",
      avatarInitials: profile?.avatar_initials || "AL",
      courseId: enrollment.course_id,
      enrollmentStatus: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      studyGroup: enrollment.study_group,
      mirrorGroup: enrollment.mirror_group ?? 1,
      groupManualOverride: enrollment.group_manual_override,
      questionnaire: enrollment.questionnaire,
      manualStatus:
        manual.data?.find((row) => row.user_id === enrollment.user_id)
          ?.status ?? null,
      hotmartActiveCount: purchases.filter((row) => row.status === "active")
        .length,
      hotmartSuspendedCount: purchases.filter(
        (row) => row.status === "suspended",
      ).length,
      hotmartRevokedCount: purchases.filter((row) => row.status === "revoked")
        .length,
      accessBlock: block
        ? {
            reason: block.reason,
            blockedAt: block.blocked_at,
            blockedByName: actor?.full_name || "Administrador",
          }
        : null,
      neverSignedIn: neverSignedIn ? neverSignedIn.has(enrollment.user_id) : null,
    }
  })
}

export async function listAllStudents(): Promise<AdminStudent[]> {
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, user_id, course_id, status, enrolled_at, study_group, mirror_group, group_manual_override, questionnaire, profiles!enrollments_user_id_fkey(full_name, avatar_initials)",
    )
    .order("enrolled_at", { ascending: false })

  return (enrollments ?? []).map((enrollment: any) => {
    const profile = Array.isArray(enrollment.profiles)
      ? enrollment.profiles[0]
      : enrollment.profiles

    return {
      id: enrollment.id,
      userId: enrollment.user_id,
      fullName: profile?.full_name || "Aluno",
      email: "",
      avatarInitials: profile?.avatar_initials || "AL",
      courseId: enrollment.course_id,
      enrollmentStatus: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
    }
  })
}

export async function listHotmartProductMappings(
  courseId: string,
): Promise<HotmartProductMapping[]> {
  const supabase = await createClient()

  const { data: mappings } = await supabase
    .from("hotmart_product_mappings")
    .select("*, hotmart_offer_rules(id, offer_code, grants_access, label, created_at)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })

  return (mappings ?? []).map((mapping) => ({
    id: mapping.id,
    courseId: mapping.course_id,
    hotmartProductId: mapping.hotmart_product_id,
    hotmartProductUcode: mapping.hotmart_product_ucode,
    hotmartProductName: mapping.hotmart_product_name,
    active: mapping.active,
    offerPolicy: mapping.offer_policy === "authorized_offers" ? "authorized_offers" : "any",
    offerRules: ((mapping.hotmart_offer_rules ?? []) as any[])
      .map((rule) => ({
        id: rule.id,
        offerCode: rule.offer_code,
        grantsAccess: Boolean(rule.grants_access),
        label: rule.label,
        createdAt: rule.created_at,
      }))
      .sort((a, b) => Number(b.grantsAccess) - Number(a.grantsAccess) || a.offerCode.localeCompare(b.offerCode)),
    createdAt: mapping.created_at,
  }))
}

/**
 * Últimos eventos Hotmart recebidos (sem e-mail, nome ou payload): tipo, produto,
 * oferta e resultado. Inclui produtos ainda não vinculados, para conferência do ucode.
 */
export async function listRecentHotmartEvents(limit = 25): Promise<HotmartEventSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("hotmart_webhook_events")
    .select("id, event_type, product_ucode, offer_code, processing_status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  return (data ?? []).map((event) => ({
    id: event.id,
    eventType: event.event_type,
    productUcode: event.product_ucode,
    offerCode: event.offer_code ?? null,
    status: event.processing_status,
    message: event.error_message,
    createdAt: event.created_at,
  }))
}


export interface AdminGroupSettings {
  studyGroup: number
  disabledFeatures: string[]
  notice: string
}

/** Abas/funções e aviso por grupo do curso (linhas ausentes = tudo ligado, sem aviso). */
export async function listCourseGroupSettings(courseId: string): Promise<AdminGroupSettings[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("course_group_settings")
    .select("study_group, disabled_features, notice")
    .eq("course_id", courseId)
  if (error) return []
  return (data ?? []).map((row) => ({
    studyGroup: row.study_group,
    disabledFeatures: row.disabled_features ?? [],
    notice: row.notice ?? "",
  }))
}
