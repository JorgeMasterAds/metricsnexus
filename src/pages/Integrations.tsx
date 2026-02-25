import DashboardLayout from "@/components/DashboardLayout";
import WebhookManager from "@/components/WebhookManager";

export default function Integrations() {
  return (
    <DashboardLayout title="Integrações" subtitle="Gerencie seus webhooks e integrações">
      <div className="max-w-4xl w-full mx-auto">
        <WebhookManager />
      </div>
    </DashboardLayout>
  );
}
