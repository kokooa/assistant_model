"use server";

import { spawn } from "node:child_process";
import path from "node:path";
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
export async function syncNotionAction(formData: FormData) {
  await requireAdmin();
  const scope = String(formData.get("scope") ?? "GLOBAL").toUpperCase();
  const department = String(formData.get("department") ?? "").trim();
  const rootPageId = String(formData.get("rootPageId") ?? "").trim();

  if (scope !== "GLOBAL" && scope !== "DEPARTMENT") {
    throw new Error("scope 는 GLOBAL 또는 DEPARTMENT 여야 해요");
  }
  if (scope === "DEPARTMENT" && !department) {
    throw new Error("DEPARTMENT scope 일 때는 부서명을 골라야 해요");
  }

  const script = path.join(process.cwd(), "scripts", "sync-notion.mjs");
  const args: string[] = [script];
  if (scope === "DEPARTMENT") args.push("--scope", "DEPARTMENT", "--department", department);
  if (rootPageId) args.push("--root", rootPageId);

  const child = spawn("node", args, {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  // sync 가 끝나면 chunks 가 바뀌므로 revalidate 도 함께 — 화면의 chunk 수 갱신은
  // 사용자가 새로고침할 때 반영(spawn 은 비동기라 revalidate 시점에는 변화 없음).
  revalidatePath("/settings/admin");
}
