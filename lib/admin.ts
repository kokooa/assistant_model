import { prisma } from "./prisma.ts";
import type { Role } from "@prisma/client";

// 관리자 작업의 순수 Prisma 로직. ADMIN 가드는 caller(서버 액션 또는 검증 스크립트) 가 한다.

const ROLES = ["ADMIN", "DEPT_ADMIN", "MEMBER"] as const;
type RoleStr = (typeof ROLES)[number];

function isRole(v: string): v is RoleStr {
  return (ROLES as readonly string[]).includes(v);
}

export async function setUserRole(userId: string, role: string) {
  if (!isRole(role)) throw new Error(`알 수 없는 역할: ${role}`);
  await prisma.user.update({ where: { id: userId }, data: { role: role as Role } });
}

export async function setUserDepartment(userId: string, departmentId: string | null) {
  if (departmentId) {
    const exists = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!exists) throw new Error("존재하지 않는 부서");
  }
  await prisma.user.update({ where: { id: userId }, data: { departmentId } });
}

export async function createDepartment(name: string) {
  const n = name.trim();
  if (!n) throw new Error("부서 이름이 비어 있어요");
  const exists = await prisma.department.findUnique({ where: { name: n } });
  if (exists) throw new Error("이미 같은 이름의 부서가 있어요");
  return prisma.department.create({ data: { name: n } });
}

export async function deleteDepartment(departmentId: string) {
  const members = await prisma.user.count({ where: { departmentId } });
  if (members > 0) throw new Error(`소속 멤버 ${members}명 — 먼저 이동시켜야 삭제할 수 있어요`);
  await prisma.department.delete({ where: { id: departmentId } });
}
