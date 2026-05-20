import { CompanySetupWizard } from "@/components/tenant/company-setup-wizard";

export default function TenantSetupPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Company setup</h1>
      <CompanySetupWizard />
    </div>
  );
}
