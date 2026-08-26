import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/hooks/useApp";
import { getAccountTypeLabel } from "@/lib/auth/account";
import { canAssignRole, hasPermission, type UserRole } from "@/lib/auth/permissions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  changeUserRoleThunk,
  deleteUserThunk,
  fetchAllUsersThunk,
  selectAdminUsers,
  selectUpdatingUser,
  selectUsersLoading,
  suspendUserThunk,
  unsuspendUserThunk,
} from "@/store/slices/adminSlice";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "إدارة المستخدمين | عجلات الجزائر" }] }),
  component: AdminUsersPage,
});

const ROLE_LABEL: Record<string, string> = {
  user: "مستخدم",
  moderator: "مشرف",
  admin: "مدير",
};

const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  suspended: "معلّق",
  pending: "معلّق التسجيل",
  deleted: "محذوف",
};

function AdminUsersPage() {
  const { user } = useApp();
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAdminUsers);
  const loading = useAppSelector(selectUsersLoading);
  const updating = useAppSelector(selectUpdatingUser);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canSuspend = user ? hasPermission(user, "users:suspend") : false;
  const canDelete = user ? hasPermission(user, "users:delete") : false;
  const canPromote = user ? hasPermission(user, "users:promote") : false;

  useEffect(() => {
    if (!user) return;
    void dispatch(
      fetchAllUsersThunk({
        currentUser: user,
        options: { limit: 100, sortBy: "memberSince", sortOrder: "desc" },
      }),
    );
  }, [dispatch, user]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.accountStatus !== statusFilter) return false;
      if (!q.trim()) return true;
      const term = q.trim().toLowerCase();
      return `${u.displayName} ${u.email} ${u.phoneNumber} ${u.wilaya}`.toLowerCase().includes(term);
    });
  }, [users, q, roleFilter, statusFilter]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت العملية");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إدارة المستخدمين</h2>
        <p className="text-sm text-muted-foreground">عرض، تعليق، حذف ناعم، وتغيير الأدوار</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="h-11 max-w-xs"
          placeholder="بحث بالاسم أو الإيميل..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-11 w-40">
            <SelectValue placeholder="الدور" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأدوار</SelectItem>
            <SelectItem value="user">مستخدم</SelectItem>
            <SelectItem value="moderator">مشرف</SelectItem>
            <SelectItem value="admin">مدير</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="suspended">معلّق</SelectItem>
            <SelectItem value="deleted">محذوف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && users.length === 0 ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا يوجد مستخدمون مطابقون.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((u) => {
            const isSelf = user?.id === u.id;
            const isTargetAdmin = u.role === "admin";
            const locked = isSelf || isTargetAdmin;

            return (
              <Card key={u.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{u.displayName || u.name}</span>
                      <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      <Badge variant="outline">{STATUS_LABEL[u.accountStatus] ?? u.accountStatus}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {u.email} · {u.phoneNumber || "—"} · {u.wilaya || "—"} ·{" "}
                      {getAccountTypeLabel(u.accountType)}
                    </p>
                  </div>
                  {!locked && (
                    <div className="flex flex-wrap gap-2">
                      {canSuspend && u.accountStatus === "active" && (
                        <Button
                          variant="outline"
                          className="h-10"
                          disabled={updating}
                          onClick={() =>
                            run(
                              async () => {
                                if (!user) return;
                                const r = await dispatch(
                                  suspendUserThunk({
                                    currentUser: user,
                                    targetUserId: u.id,
                                    reason: "تعليق من لوحة الإدارة",
                                  }),
                                );
                                if (suspendUserThunk.rejected.match(r)) throw new Error(r.error.message);
                              },
                              "تم تعليق المستخدم",
                            )
                          }
                        >
                          تعليق
                        </Button>
                      )}
                      {canSuspend && (u.accountStatus === "suspended" || u.accountStatus === "deleted") && (
                        <Button
                          variant="outline"
                          className="h-10"
                          disabled={updating}
                          onClick={() =>
                            run(
                              async () => {
                                if (!user) return;
                                const r = await dispatch(
                                  unsuspendUserThunk({ currentUser: user, targetUserId: u.id }),
                                );
                                if (unsuspendUserThunk.rejected.match(r)) throw new Error(r.error.message);
                              },
                              "تم استعادة الحساب",
                            )
                          }
                        >
                          استعادة
                        </Button>
                      )}
                      {canDelete && u.accountStatus !== "deleted" && (
                        <Button
                          variant="ghost"
                          className="h-10 text-destructive"
                          disabled={updating}
                          onClick={() =>
                            run(
                              async () => {
                                if (!user) return;
                                const r = await dispatch(
                                  deleteUserThunk({
                                    currentUser: user,
                                    targetUserId: u.id,
                                    reason: "حذف ناعم من لوحة الإدارة",
                                  }),
                                );
                                if (deleteUserThunk.rejected.match(r)) throw new Error(r.error.message);
                              },
                              "تم إيقاف الحساب",
                            )
                          }
                        >
                          حذف
                        </Button>
                      )}
                      {canPromote && user && canAssignRole(user, "moderator") && u.role === "user" && (
                        <Button
                          variant="outline"
                          className="h-10"
                          disabled={updating}
                          onClick={() =>
                            run(
                              async () => {
                                const r = await dispatch(
                                  changeUserRoleThunk({
                                    currentUser: user,
                                    targetUserId: u.id,
                                    newRole: "moderator" as UserRole,
                                    reason: "ترقية من لوحة الإدارة",
                                  }),
                                );
                                if (changeUserRoleThunk.rejected.match(r)) throw new Error(r.error.message);
                              },
                              "تمت الترقية إلى مشرف",
                            )
                          }
                        >
                          ترقية لمشرف
                        </Button>
                      )}
                      {canPromote && user && canAssignRole(user, "user") && u.role === "moderator" && (
                        <Button
                          variant="outline"
                          className="h-10"
                          disabled={updating}
                          onClick={() =>
                            run(
                              async () => {
                                const r = await dispatch(
                                  changeUserRoleThunk({
                                    currentUser: user,
                                    targetUserId: u.id,
                                    newRole: "user",
                                    reason: "إلغاء إشراف من لوحة الإدارة",
                                  }),
                                );
                                if (changeUserRoleThunk.rejected.match(r)) throw new Error(r.error.message);
                              },
                              "تم إلغاء الإشراف",
                            )
                          }
                        >
                          إلغاء إشراف
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
