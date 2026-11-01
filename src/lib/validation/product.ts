import { z } from "zod";

const MAX_PAISA = 2_000_000_000;
const paisa = z.number().int().min(0).max(MAX_PAISA);
const optText = (max: number) => z.string().trim().max(max).nullable().transform((v) => (v ? v : null));

export const productInput = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Name is too short").max(200),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only a-z, 0-9 and dashes").max(100),
    description: z.string().max(20000),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    categoryId: z.string().nullable(),
    isFeatured: z.boolean(),
    seoTitle: optText(70),
    seoDescription: optText(170),
    options: z
      .array(z.object({ name: z.string().trim().min(1, "Option name required").max(40), values: z.array(z.string().trim().min(1).max(40)).min(1, "Add at least one value").max(30) }))
      .max(3, "Up to 3 options"),
    images: z.array(z.object({ id: z.string().optional(), url: z.string().min(1).max(500), key: z.string().min(1).max(300), alt: optText(200) })).max(20),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          sku: z.string().trim().min(1, "SKU required").max(64),
          pricePaisa: paisa,
          compareAtPricePaisa: paisa.nullable(),
          costPaisa: paisa.nullable(),
          stock: z.number().int().min(0).max(1_000_000),
          lowStockThreshold: z.number().int().min(0).max(100000).nullable(),
          weightGrams: z.number().int().min(0).max(1_000_000).nullable(),
          isActive: z.boolean(),
          imageKey: z.string().nullable(),
          options: z.array(z.string().trim()),
        }),
      )
      .min(1, "Add at least one variant")
      .max(200),
  })
  .superRefine((p, ctx) => {
    const names = p.options.map((o) => o.name.toLowerCase());
    if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", message: "Option names must be unique", path: ["options"] });
    p.options.forEach((o, i) => {
      if (new Set(o.values.map((v) => v.toLowerCase())).size !== o.values.length) ctx.addIssue({ code: "custom", message: `Duplicate values in "${o.name}"`, path: ["options", i] });
    });
    const combos = new Set<string>();
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      if (v.options.length !== p.options.length) ctx.addIssue({ code: "custom", message: "Each variant needs a value for every option", path: ["variants", i] });
      v.options.forEach((val, j) => {
        if (p.options[j] && !p.options[j].values.includes(val)) ctx.addIssue({ code: "custom", message: `Unknown value "${val}"`, path: ["variants", i] });
      });
      const key = v.options.join("\u0000");
      if (combos.has(key)) ctx.addIssue({ code: "custom", message: "Two variants have the same options", path: ["variants", i] });
      combos.add(key);
      const sku = v.sku.toUpperCase();
      if (skus.has(sku)) ctx.addIssue({ code: "custom", message: `Duplicate SKU ${v.sku}`, path: ["variants", i] });
      skus.add(sku);
      if (v.compareAtPricePaisa !== null && v.compareAtPricePaisa <= v.pricePaisa) ctx.addIssue({ code: "custom", message: `Compare-at price must be higher than price (${v.sku})`, path: ["variants", i] });
      if (v.imageKey && !p.images.some((img) => img.key === v.imageKey)) ctx.addIssue({ code: "custom", message: "Variant image not found", path: ["variants", i] });
    });
  });

export type ProductInput = z.input<typeof productInput>;
