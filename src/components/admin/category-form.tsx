"use client";
import { useActionState } from "react";
import { saveCategory } from "@/app/admin/categories/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

type Cat = { id: string; name: string; slug: string; description: string | null; parentId: string | null; sortOrder: number; isActive: boolean; seoTitle: string | null; seoDescription: string | null };

export function CategoryForm({ cat, parents }: { cat?: Cat; parents: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveCategory, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <div><label className={labelCls}>Name</label><input name="name" required defaultValue={cat?.name} className={inputCls} /></div>
      <div><label className={labelCls}>Slug</label><input name="slug" defaultValue={cat?.slug} placeholder="auto" className={inputCls} /></div>
      <div><label className={labelCls}>Parent</label>
        <select name="parentId" defaultValue={cat?.parentId ?? ""} className={inputCls}>
          <option value="">None (top level)</option>
          {parents.filter((p) => p.id !== cat?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>Sort order</label><input name="sortOrder" type="number" defaultValue={cat?.sortOrder ?? 0} className={inputCls} /></div>
      <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea name="description" rows={2} defaultValue={cat?.description ?? ""} className={inputCls} /></div>
      <div><label className={labelCls}>SEO title</label><input name="seoTitle" maxLength={70} defaultValue={cat?.seoTitle ?? ""} className={inputCls} /></div>
      <div><label className={labelCls}>SEO description</label><input name="seoDescription" maxLength={170} defaultValue={cat?.seoDescription ?? ""} className={inputCls} /></div>
      <div><label className={labelCls}>Image</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></div>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isActive" defaultChecked={cat?.isActive ?? true} /> Visible in store</label>
      <div className="flex items-center gap-3 sm:col-span-2"><SubmitButton>{cat ? "Save" : "Add category"}</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
