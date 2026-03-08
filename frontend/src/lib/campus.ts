import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberRole = "owner" | "admin" | "instructor" | "student";
export type MembershipStatus = "active" | "pending" | "invited";
export type AssignmentStatus = "upcoming" | "submitted" | "graded" | "overdue";

export interface Institution {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  avatar_initials: string;
  avatar_color: string;
  member_count: number;
  course_count: number;
  is_public: boolean;
  invite_code: string;
  created_at: string;
  // enriched client-side
  userRole?: MemberRole | null;
  memberStatus?: MembershipStatus | null;
  assignment_count?: number;
}

export interface Course {
  id: string;
  institution_id: string;
  title: string;
  description: string;
  instructor_name: string;
  instructor_id: string;
  student_count: number;
  assignment_count: number;
  color: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  institution_id: string;
  course_title?: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  created_at: string;
  status: AssignmentStatus;
  score?: number;
  file_url?: string | null;
  file_type?: string | null; // 'pdf' | 'image'
  assigned_to?: string[] | null; // null = everyone
  // member's own submission (populated for non-admins)
  submission_file_url?: string | null;
  submission_file_type?: string | null; // 'pdf' | 'image'
}

export interface Announcement {
  id: string;
  institution_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  title: string;
  body: string;
  created_at: string;
  pinned: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null; // 'pdf' | 'image'
}

export interface CampusMember {
  id: string;
  institution_id: string;
  user_id: string;
  name: string;
  avatar_initials: string;
  role: MemberRole;
  joined_at: string;
  status: MembershipStatus;
}

export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  file_url: string | null;
  file_type: string | null; // 'pdf' | 'image'
  score: number | null;
  graded: boolean;
  submitted_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  if (w > 0) return `${w}w ago`;
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage under campus-files/{folder}/{institutionId}/.
 * Returns the public URL.
 */
export async function uploadCampusFile(
  file: File,
  folder: "assignments" | "announcements",
  institutionId: string,
): Promise<{ url: string; type: "pdf" | "image" }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const type: "pdf" | "image" = ext === "pdf" ? "pdf" : "image";
  const path = `${folder}/${institutionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("campus-files")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("campus-files").getPublicUrl(path);
  return { url: data.publicUrl, type };
}

// ─── Institutions ─────────────────────────────────────────────────────────────

/** Fetch all institutions, optionally enriched with the user's membership. */
export async function fetchInstitutions(
  userId: string | null,
): Promise<Institution[]> {
  const { data, error } = await supabase
    .from("campus_institutions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const institutions: Institution[] = (data ?? []).map((i) => ({
    ...i,
    userRole: null,
    memberStatus: null,
  }));

  if (!userId || institutions.length === 0) return institutions;

  const ids = institutions.map((i) => i.id);
  const { data: memberships } = await supabase
    .from("campus_members")
    .select("institution_id, role, status")
    .eq("user_id", userId)
    .in("institution_id", ids);

  const memberMap: Record<
    string,
    { role: MemberRole; status: MembershipStatus }
  > = {};
  for (const m of memberships ?? []) {
    memberMap[m.institution_id] = { role: m.role, status: m.status };
  }

  return institutions.map((i) => ({
    ...i,
    userRole: memberMap[i.id]?.role ?? null,
    memberStatus: memberMap[i.id]?.status ?? null,
  }));
}

/** Fetch a single institution by invite code. */
export async function fetchInstitutionByCode(
  code: string,
): Promise<Institution | null> {
  const { data, error } = await supabase
    .from("campus_institutions")
    .select("*")
    .ilike("invite_code", code.trim())
    .single();

  if (error || !data) return null;
  return { ...data, userRole: null, memberStatus: null };
}

/** Create a new institution (owner is auto-added as member). */
export async function createInstitution(payload: {
  owner_id: string;
  name: string;
  description: string;
  avatar_initials: string;
  avatar_color: string;
  is_public: boolean;
  owner_name: string;
  owner_avatar: string;
}): Promise<Institution> {
  const { data: codeData, error: codeErr } = await supabase.rpc(
    "generate_invite_code",
    {
      prefix: payload.avatar_initials.slice(0, 4),
    },
  );
  if (codeErr) throw new Error(codeErr.message);

  const { data, error } = await supabase
    .from("campus_institutions")
    .insert({
      owner_id: payload.owner_id,
      name: payload.name,
      description: payload.description,
      avatar_initials: payload.avatar_initials,
      avatar_color: payload.avatar_color,
      is_public: payload.is_public,
      invite_code: codeData as string,
      member_count: 1,
      course_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("campus_members").insert({
    institution_id: data.id,
    user_id: payload.owner_id,
    name: payload.owner_name,
    avatar_initials: payload.owner_avatar,
    role: "owner",
    status: "active",
  });

  return { ...data, userRole: "owner", memberStatus: "active" };
}

/** Join an institution via the RPC. Returns 'active' or 'pending'. */
export async function joinInstitution(
  institutionId: string,
  userId: string,
  name: string,
  avatarInitials: string,
): Promise<MembershipStatus> {
  const { data, error } = await supabase.rpc("join_campus_institution", {
    p_institution_id: institutionId,
    p_user_id: userId,
    p_name: name,
    p_avatar: avatarInitials,
  });
  if (error) throw new Error(error.message);
  return data as MembershipStatus;
}

/** Returns the first active institution the user belongs to. */
export async function fetchMyInstitution(
  userId: string,
): Promise<Institution | null> {
  const { data: membership } = await supabase
    .from("campus_members")
    .select("institution_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: inst } = await supabase
    .from("campus_institutions")
    .select("*")
    .eq("id", membership.institution_id)
    .single();

  if (!inst) return null;
  return {
    ...inst,
    userRole: membership.role,
    memberStatus: membership.status,
  };
}

/** Returns ALL institutions the user is an active member of, with assignment counts. */
export async function fetchMyInstitutions(
  userId: string,
): Promise<Institution[]> {
  const { data: memberships } = await supabase
    .from("campus_members")
    .select("institution_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (!memberships || memberships.length === 0) return [];

  const ids = memberships.map((m) => m.institution_id);

  const { data: insts } = await supabase
    .from("campus_institutions")
    .select("*")
    .in("id", ids);

  if (!insts) return [];

  const { data: assignRows } = await supabase
    .from("campus_assignments")
    .select("institution_id")
    .in("institution_id", ids);

  const assignMap: Record<string, number> = {};
  for (const a of assignRows ?? []) {
    assignMap[a.institution_id] = (assignMap[a.institution_id] ?? 0) + 1;
  }

  const memberMap: Record<
    string,
    { role: MemberRole; status: MembershipStatus }
  > = {};
  for (const m of memberships) {
    memberMap[m.institution_id] = { role: m.role, status: m.status };
  }

  return insts.map((i) => ({
    ...i,
    userRole: memberMap[i.id]?.role ?? null,
    memberStatus: memberMap[i.id]?.status ?? null,
    assignment_count: assignMap[i.id] ?? 0,
  }));
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function fetchCourses(institutionId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from("campus_courses")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCourse(payload: {
  institution_id: string;
  title: string;
  description: string;
  instructor_name: string;
  instructor_id: string;
  color: string;
}): Promise<Course> {
  const { data, error } = await supabase
    .from("campus_courses")
    .insert({ ...payload, student_count: 0, assignment_count: 0 })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { data: inst } = await supabase
    .from("campus_institutions")
    .select("course_count")
    .eq("id", payload.institution_id)
    .single();
  if (inst) {
    await supabase
      .from("campus_institutions")
      .update({ course_count: (inst.course_count ?? 0) + 1 })
      .eq("id", payload.institution_id);
  }

  return data;
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function fetchAssignments(
  institutionId: string,
  userId: string,
  userRole?: MemberRole | null,
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("campus_assignments")
    .select("*, campus_courses(title)")
    .eq("institution_id", institutionId)
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);

  const isAdmin = userRole === "owner" || userRole === "admin";
  const allAssignments = data ?? [];

  // Filter: owners/admins see all; members see only unassigned or explicitly assigned to them
  const visible = isAdmin
    ? allAssignments
    : allAssignments.filter(
      (a) =>
        !a.assigned_to ||
        (Array.isArray(a.assigned_to) && a.assigned_to.includes(userId)),
    );

  const ids = visible.map((a) => a.id);

  const { data: subs } = await supabase
    .from("campus_submissions")
    .select("assignment_id, score, graded, file_url, file_type")
    .eq("user_id", userId)
    .in("assignment_id", ids);

  const subMap: Record<
    string,
    {
      score?: number;
      graded: boolean;
      file_url?: string | null;
      file_type?: string | null;
    }
  > = {};
  for (const s of subs ?? []) {
    subMap[s.assignment_id] = {
      score: s.score ?? undefined,
      graded: s.graded,
      file_url: s.file_url ?? null,
      file_type: s.file_type ?? null,
    };
  }

  const now = Date.now();

  return visible.map((a) => {
    const sub = subMap[a.id];
    const courseTitle =
      (a.campus_courses as { title: string } | null)?.title ?? "";
    let status: AssignmentStatus;

    if (sub?.graded) {
      status = "graded";
    } else if (sub) {
      status = "submitted";
    } else if (new Date(a.due_date).getTime() < now) {
      status = "overdue";
    } else {
      status = "upcoming";
    }

    return {
      id: a.id,
      course_id: a.course_id,
      institution_id: a.institution_id,
      course_title: courseTitle,
      title: a.title,
      description: a.description,
      due_date: a.due_date,
      max_points: a.max_points,
      created_at: a.created_at,
      status,
      score: sub?.score,
      file_url: a.file_url ?? null,
      file_type: a.file_type ?? null,
      assigned_to: a.assigned_to ?? null,
      submission_file_url: sub?.file_url ?? null,
      submission_file_type: sub?.file_type ?? null,
    };
  });
}

export async function createAssignment(payload: {
  institution_id: string;
  course_id?: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  file_url?: string | null;
  file_type?: string | null;
  assigned_to?: string[] | null;
}): Promise<Assignment> {
  // If no course_id provided, use a sentinel approach: insert without it (course_id is required in the schema).
  // For direct group assignments we use a virtual course. We'll insert with the institution_id-based course_id.
  const row: Record<string, unknown> = {
    institution_id: payload.institution_id,
    title: payload.title,
    description: payload.description,
    due_date: payload.due_date,
    max_points: payload.max_points,
    file_url: payload.file_url ?? null,
    file_type: payload.file_type ?? null,
    assigned_to: payload.assigned_to ?? null,
  };

  // Ensure there is a "General" course for direct group assignments
  if (!payload.course_id) {
    let { data: existing } = await supabase
      .from("campus_courses")
      .select("id")
      .eq("institution_id", payload.institution_id)
      .eq("title", "General")
      .single();
    if (!existing) {
      const { data: created } = await supabase
        .from("campus_courses")
        .insert({
          institution_id: payload.institution_id,
          title: "General",
          description: "",
          instructor_name: "Admin",
          instructor_id: "system",
          color: "emerald",
        })
        .select()
        .single();
      existing = created;
    }
    row.course_id = existing?.id;
  } else {
    row.course_id = payload.course_id;
  }

  const { data, error } = await supabase
    .from("campus_assignments")
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);

  return { ...data, status: "upcoming" };
}

export async function submitAssignment(
  assignmentId: string,
  userId: string,
  opts?: {
    file_url?: string | null;
    file_type?: string | null;
    user_name?: string;
    user_avatar?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("campus_submissions").upsert(
    {
      assignment_id: assignmentId,
      user_id: userId,
      graded: false,
      file_url: opts?.file_url ?? null,
      file_type: opts?.file_type ?? null,
      user_name: opts?.user_name ?? "Member",
      user_avatar: opts?.user_avatar ?? "??",
    },
    { onConflict: "assignment_id,user_id" },
  );
  if (error) throw new Error(error.message);
}

/** Fetch all submissions for an assignment (owner/admin use). */
export async function fetchSubmissions(
  assignmentId: string,
): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("campus_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Grade a submission — set score and mark graded = true. */
export async function gradeSubmission(
  submissionId: string,
  score: number,
): Promise<void> {
  const { error } = await supabase
    .from("campus_submissions")
    .update({ score, graded: true })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
}


// ─── Announcements ────────────────────────────────────────────────────────────

export async function fetchAnnouncements(
  institutionId: string,
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("campus_announcements")
    .select("*")
    .eq("institution_id", institutionId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAnnouncement(payload: {
  institution_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  title: string;
  body: string;
  pinned: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
}): Promise<Announcement> {
  const { data, error } = await supabase
    .from("campus_announcements")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function fetchMembers(
  institutionId: string,
): Promise<CampusMember[]> {
  const { data, error } = await supabase
    .from("campus_members")
    .select("*, user_profiles:user_id(display_name, username)")
    .eq("institution_id", institutionId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Use latest display_name from user_profiles if available
  return (data ?? []).map((m) => {
    const profile = m.user_profiles as { display_name?: string; username?: string } | null;
    const latestName = profile?.display_name || m.name;
    const initials = latestName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    return {
      ...m,
      name: latestName,
      avatar_initials: initials || m.avatar_initials,
      user_profiles: undefined, // clean up joined data
    };
  });
}

export async function fetchMyMembership(
  institutionId: string,
  userId: string,
): Promise<CampusMember | null> {
  const { data } = await supabase
    .from("campus_members")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function approveMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("campus_members")
    .update({ status: "active" })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("campus_members")
    .delete()
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function promoteMember(
  memberId: string,
  newRole: "instructor" | "admin" | "student",
): Promise<void> {
  const { error } = await supabase
    .from("campus_members")
    .update({ role: newRole })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}


// alias for clarity
export const rejectMember = removeMember;

/** Fetch the institution owned by this user (for manage page). */
export async function fetchOwnedInstitution(
  userId: string,
): Promise<Institution | null> {
  const { data } = await supabase
    .from("campus_institutions")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!data) return null;
  return { ...data, userRole: "owner", memberStatus: "active" };
}

/** Fetch ALL institutions owned by this user. */
export async function fetchOwnedInstitutions(
  userId: string,
): Promise<Institution[]> {
  const { data } = await supabase
    .from("campus_institutions")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((d) => ({
    ...d,
    userRole: "owner" as const,
    memberStatus: "active" as const,
  }));
}

/** Regenerate the invite code for an institution. */
export async function regenerateInviteCode(
  institutionId: string,
  prefix: string,
): Promise<string> {
  const { data: code, error: codeErr } = await supabase.rpc(
    "generate_invite_code",
    {
      prefix: prefix.slice(0, 4).toUpperCase(),
    },
  );
  if (codeErr) throw new Error(codeErr.message);

  const { error } = await supabase
    .from("campus_institutions")
    .update({ invite_code: code as string })
    .eq("id", institutionId);
  if (error) throw new Error(error.message);

  return code as string;
}

/** Update institution details. */
export async function updateInstitution(
  institutionId: string,
  data: Partial<
    Pick<Institution, "name" | "description" | "avatar_color" | "is_public">
  >,
): Promise<void> {
  const { error } = await supabase
    .from("campus_institutions")
    .update(data)
    .eq("id", institutionId);
  if (error) throw new Error(error.message);
}

// ─── Legacy mock arrays (kept for backward compat, now empty) ─────────────────
