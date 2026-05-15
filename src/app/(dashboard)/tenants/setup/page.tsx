import { CompanySetupWizard } from "@/components/tenant/company-setup-wizard";

export default function TenantSetupPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company setup</h1>
        <p className="mt-2 text-muted-foreground">
          US-2: create your tenant (company) profile so accounting data stays isolated.
        </p>
      </div>
      <CompanySetupWizard />
    </div>
  );
}
