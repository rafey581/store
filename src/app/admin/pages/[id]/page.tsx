import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/page-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deletePage } from "../actions";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const p = await db.page.findUnique({ where: { id: (await params).id } });
  if (!p) notFound();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={p.title}
        actions={
          <>
            {p.isPublished && <Link href={`/pages/${p.slug}`} target="_blank" className="rounded-lg border bg-white px-4 py-2 text-sm">View</Link>}
            <form action={deletePage}><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Delete this page?">Delete</ConfirmButton></form>
          </>
        }
      />
      <section className={`${cardCls} p-5`}><PageForm p={p} /></section>
    </div>
  );
}
