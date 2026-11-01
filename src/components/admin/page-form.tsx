"use client";
import { useActionState } from "react";
import { savePage } from "@/app/admin/pages/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

type P = { id?: string; title: string; slug: string; content: string; sortOrder: number; isPublished: boolean; showInFooter: boolean };

export function PageForm({ p }: { p?: P }) {
  const [state, action] = useActionState(savePage, null);
  return (
    <form action={action} className="space-y-4">
      {p?.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2"><label className={labelCls}>Title</label><input name="title" required defaultValue={p?.title} className={inputCls} /></div>
        <div><label className={labelCls}>URL slug</label><input name="slug" defaultValue={p?.slug} placeholder="auto" className={inputCls} /></div>
      </div>
      <div>
        <label className={labelCls}>Content</label>
        <textarea name="content" rows={18} defaultValue={p?.content} className={`${inputCls} font-mono`} />
        <p className="mt-1 text-xs text-gray-500">Plain text. Start a line with <code>## </code> for a heading and <code>- </code> for a bullet. Leave a blank line between paragraphs. Placeholders: {"{{storeName}} {{supportEmail}} {{supportPhone}} {{whatsapp}} {{address}}"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={p?.isPublished ?? true} /> Published</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="showInFooter" defaultChecked={p?.showInFooter ?? true} /> Show in footer</label>
        <label className="flex items-center gap-2">Order <input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="w-20 rounded border px-2 py-1" /></label>
      </div>
      <div className="flex items-center gap-3"><SubmitButton>{p?.id ? "Save page" : "Create page"}</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
