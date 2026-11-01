import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { CopyButton } from "@/components/admin/copy-button";
import { DEVELOPER_SOLANA_ADDRESS, DEVELOPER_NAME } from "@/config/developer";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Help for Developer" };

export default async function HelpDeveloperPage() {
  await requireStaff();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Help for Developer" description={`This store was built by ${DEVELOPER_NAME}. If it helps your business, you can support future development with a donation.`} />
      <section className={`${cardCls} p-6`}>
        <h2 className="font-semibold">Solana (SOL) donation address</h2>
        {DEVELOPER_SOLANA_ADDRESS ? (
          <>
            <p className="mt-3 break-all rounded-lg bg-gray-50 p-3 font-mono text-sm">{DEVELOPER_SOLANA_ADDRESS}</p>
            <div className="mt-3"><CopyButton text={DEVELOPER_SOLANA_ADDRESS} /></div>
            <p className="mt-4 text-xs text-gray-500">Send only SOL or Solana SPL tokens to this address. Double-check the address before sending; blockchain transfers cannot be reversed.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-600">The donation address has not been set yet (NEXT_PUBLIC_DEVELOPER_SOLANA_ADDRESS).</p>
        )}
      </section>
    </div>
  );
}
