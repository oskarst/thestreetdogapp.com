import { AdminHeader } from "@/components/admin/admin-header";
import { SectionLabel } from "@/components/ui/section-label";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <AdminHeader eyebrow="Admin · Settings" title="System settings" />

      <SectionLabel meta="placeholder">Application Settings</SectionLabel>
      <div className="card-soft p-4 text-sm text-muted-foreground">
        Settings management will be available in a future update.
      </div>
    </div>
  );
}
