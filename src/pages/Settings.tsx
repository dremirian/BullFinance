import { DashboardLayout } from "@/components/DashboardLayout";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Configure sua conta e preferências.</p>
      </div>
    </DashboardLayout>
  );
}
