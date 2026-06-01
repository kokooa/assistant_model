"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setUserRole, setUserDepartment } from "@/lib/admin";

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
