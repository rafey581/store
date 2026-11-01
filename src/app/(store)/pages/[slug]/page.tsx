import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { pageVars } from "@/server/pages";
import { RichText } from "@/components/store/rich-text";

type Props = { params: Promise<{ slug: string }> };

async function getPage(slug: string) {
  return db.page.findFirst({ where: { slug, isPublished: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPage((await params).slug);
  return p ? { title: p.title, alternates: { canonical: `/pages/${p.slug}` } } : {};
}

export default async function ContentPage({ params }: Props) {
  const p = await getPage((await params).slug);
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-3xl py-4">
      <h1 className="mb-6 text-3xl font-bold">{p.title}</h1>
      <RichText text={p.content} vars={await pageVars()} />
    </article>
  );
}
