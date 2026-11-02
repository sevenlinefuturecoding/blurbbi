import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAdminRole } from "@/lib/admin";
import { AdminLayout } from "@/components/admin/admin-layout";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Skip guard for the login page
    if (location.pathname === "/admin/login") {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect({
        to: "/admin/login",
        search: { redirect: location.pathname },
      });
    }

    // Database-backed admin role check
    const role = await getCurrentAdminRole();
    if (!role) {
      // Fallback check on profiles.is_admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        throw redirect({
          to: "/admin/login",
          search: { error: "unauthorized" },
        });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Control Center · Super Admin · Blurbbi" },
      {
        name: "description",
        content:
          "Blurbbi Super Admin Control Center: centralized platform management, users, content, moderation, analytics, and safety.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  const location = useLocation();

  // On /admin/login, render only the child outlet without the admin chrome
  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
