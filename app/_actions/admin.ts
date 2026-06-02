"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  setUserRole,
  setUserDepartment,
  createDepartment,
  deleteDepartment,
} from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("권한 없음");
}

export async function updateUserRoleAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId) throw new Error("userId 누락");
  await setUserRole(userId, role);
  revalidatePath("/settings/admin");
}

export async function updateUserDepartmentAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!userId) throw new Error("userId 누락");
  await setUserDepartment(userId, departmentId || null);
  revalidatePath("/settings/admin");
}

export async function createDepartmentAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "");
  await createDepartment(name);
  revalidatePath("/settings/admin");
}

export async function deleteDepartmentAction(formData: FormData) {
  await requireAdmin();
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!departmentId) throw new Error("departmentId 누락");
  await deleteDepartment(departmentId);
  revalidatePath("/settings/admin");
}

// Notion 트리 → pgvector 색인 동기화. 분 단위 작업이라 spawn 으로 background fire-and-forget.
// 진행 로그는 서버 콘솔(axhub log) 에서 확인.
export async function batchUpdateUsersAction(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("changes") ?? "[]");
  const changes = JSON.parse(raw) as { id: string; role?: string; departmentId?: string | null }[];
  for (const c of changes) {
    if (typeof c.role === "string") await setUserRole(c.id, c.role);
    if (c.departmentId !== undefined) await setUserDepartment(c.id, c.departmentId || null);
  }
  revalidatePath("/settings/admin");
}

