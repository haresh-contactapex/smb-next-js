"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import UsersPageHeader, { PRIMARY_BUTTON_CLASSES } from "./UsersPageHeader";
import UsersFilters from "./UsersFilters";
import UsersTable from "./UsersTable";
import Pagination, { PAGE_SIZE_OPTIONS } from "./Pagination";
import Toast from "./Toast";
import DeleteToast from "./DeleteToast";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import { fullName, isLocked } from "./helpers";
import { confirmDelete, deleteUser } from "./userActions";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

const SAVED_MESSAGES = {
  created: { message: "User created — a welcome email with their password was sent", variant: "success" },
  "created-no-email": {
    message:
      "User created, but the welcome email couldn't be sent. Check Settings → Email, then edit the user to set a password and share it with them.",
    variant: "error",
  },
  updated: { message: "User saved", variant: "success" },
};

export default function UsersListing({ users: initialUsers, roles, permissions, currentUserId, actorFullAccess, saved }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [deletingUser, setDeletingUser] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });
  const busyRef = useRef(false);
  const toastTimerRef = useRef(null);
  const context = useMemo(() => ({ currentUserId, actorFullAccess }), [currentUserId, actorFullAccess]);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  // Confirms a save made on the add/edit screen, then drops ?saved= so a
  // reload doesn't repeat the message.
  useEffect(() => {
    if (!SAVED_MESSAGES[saved]) return;
    showToast(SAVED_MESSAGES[saved].message, SAVED_MESSAGES[saved].variant);
    router.replace("/users", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Server data changes after router.refresh(); keep local state in step.
  useEffect(() => setUsers(initialUsers), [initialUsers]);

  async function handleDelete(user) {
    if (busyRef.current || !confirmDelete(user)) return;
    busyRef.current = true;
    setDeletingUser(user);
    try {
      await deleteUser(user);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setDeleteToast({ visible: true, message: `"${fullName(user)}" was removed.` });
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busyRef.current = false;
      setDeletingUser(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (q) {
        const haystack = `${fullName(user)} ${user.email} ${user.phone}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (role && user.role !== role) return false;
      if (status === "locked" && !isLocked(user)) return false;
      if (status === "active" && isLocked(user)) return false;
      return true;
    });
  }, [users, search, role, status]);

  const sorted = useMemo(() => {
    const { key, direction } = sort;
    const dir = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (key === "role") return String(a.roleName || "").localeCompare(String(b.roleName || ""), undefined, { sensitivity: "base" }) * dir;
      if (key === "status") return (Number(isLocked(a)) - Number(isLocked(b))) * dir;
      if (key === "lastLogin") return String(a.lastLoginAt || "").localeCompare(String(b.lastLoginAt || "")) * dir;
      if (key === "created") return String(a.createdAt || "").localeCompare(String(b.createdAt || "")) * dir;
      return fullName(a).localeCompare(fullName(b), undefined, { sensitivity: "base" }) * dir;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  function handleSortChange(key) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setPage(1);
  }

  const lockedCount = users.filter(isLocked).length;

  return (
    <>
      <UsersPageHeader title="All Users">
        {permissions.canCreate && (
          <Link href="/users/new" className={PRIMARY_BUTTON_CLASSES}>
            <Icon name="plus-circle" className="w-4 h-4" />
            Add User
          </Link>
        )}
      </UsersPageHeader>

      <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
        {users.length} user{users.length === 1 ? "" : "s"}
        {lockedCount > 0 ? ` · ${lockedCount} locked` : ""}. Staff accounts that can sign in to this admin panel.
      </p>

      <UsersFilters
        search={search}
        onSearchChange={updateFilter(setSearch)}
        role={role}
        onRoleChange={updateFilter(setRole)}
        roles={roles}
        status={status}
        onStatusChange={updateFilter(setStatus)}
        resultCount={sorted.length}
        hasActiveFilters={Boolean(search || role || status)}
        onClear={() => {
          setSearch("");
          setRole("");
          setStatus("");
          setPage(1);
        }}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <UsersTable
          users={pageItems}
          busyId={deletingUser?.id}
          permissions={permissions}
          context={context}
          onDelete={handleDelete}
          sort={sort}
          onSortChange={handleSortChange}
        />
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          totalCount={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </section>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
      <DeleteOverlay
        active={deletingUser != null}
        title="Deleting user…"
        itemLabel={deletingUser ? fullName(deletingUser) : ""}
      />
      <DeleteToast
        visible={deleteToast.visible}
        message={deleteToast.message}
        onDismiss={() => setDeleteToast((t) => ({ ...t, visible: false }))}
      />
    </>
  );
}
