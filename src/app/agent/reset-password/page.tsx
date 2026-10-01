import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/agent/NewPasswordForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set a new password · BuyDown Indy" };

export default async function ResetPasswordPage() {
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?error=link");
  return (
    <AppShell>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[460px] p-4 lg:p-8">
          <NewPasswordForm email={me.email} />
        </div>
      </div>
    </AppShell>
  );
}
