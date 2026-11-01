// Seeds an owner account, store settings, categories, demo products,
// shipping rates for major cities, a manual payment account and a coupon.
// Safe to run more than once (upserts).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const ownerEmail = (process.env.SEED_OWNER_EMAIL || "owner@example.com").toLowerCase();
const ownerPassword = process.env.SEED_OWNER_PASSWORD || "ChangeMe123!";
const withDemo = process.env.SEED_DEMO !== "false";

const cities: [string, string, number][] = [
  ["Karachi", "Sindh", 200], ["Lahore", "Punjab", 200], ["Islamabad", "Islamabad Capital Territory", 200],
  ["Rawalpindi", "Punjab", 200], ["Faisalabad", "Punjab", 250], ["Multan", "Punjab", 250], ["Peshawar", "Khyber Pakhtunkhwa", 250],
  ["Quetta", "Balochistan", 350], ["Hyderabad", "Sindh", 250], ["Gujranwala", "Punjab", 250], ["Sialkot", "Punjab", 250], ["Sargodha", "Punjab", 250],
  ["Bahawalpur", "Punjab", 300], ["Sukkur", "Sindh", 300], ["Abbottabad", "Khyber Pakhtunkhwa", 300],
];

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_OWNER_PASSWORD) throw new Error("Set SEED_OWNER_PASSWORD when seeding production.");
  await db.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, storeName: process.env.SEED_STORE_NAME || "My Store", supportEmail: "support@example.com", supportPhone: "0300-0000000", freeShippingAbovePaisa: 500000 } });

  await db.user.upsert({
    where: { email: ownerEmail },
    update: { role: "OWNER" },
    create: { email: ownerEmail, name: "Store Owner", role: "OWNER", passwordHash: await bcrypt.hash(ownerPassword, 12) },
  });
  console.log(`Owner: ${ownerEmail}${process.env.SEED_OWNER_PASSWORD ? "" : ` / ${ownerPassword}`}`);

  for (const [city, province, fee] of cities) {
    await db.shippingRate.upsert({ where: { cityKey: city.toLowerCase() }, update: {}, create: { city, cityKey: city.toLowerCase(), province, feePaisa: fee * 100, minDays: 2, maxDays: city === "Quetta" ? 7 : 5 } });
  }

  if (!withDemo) return;

  await db.user.upsert({ where: { email: "staff@example.com" }, update: {}, create: { email: "staff@example.com", name: "Demo Staff", role: "STAFF", passwordHash: await bcrypt.hash("ChangeMe123!", 12) } });

  const existingAccount = await db.manualPaymentAccount.findFirst();
  if (!existingAccount) {
    await db.manualPaymentAccount.createMany({
      data: [
        { type: "BANK", label: "Meezan Bank", accountTitle: "My Store", accountNumber: "0000-0000000000", iban: "PK00MEZN0000000000000000", instructions: "Use your order number as the payment reference.", sortOrder: 0 },
        { type: "WALLET", label: "JazzCash Wallet", accountTitle: "My Store", accountNumber: "03000000000", sortOrder: 1 },
      ],
    });
  }

  await db.coupon.upsert({ where: { code: "WELCOME10" }, update: {}, create: { code: "WELCOME10", description: "10% off, max Rs 1,000", type: "PERCENT", value: 1000, maxDiscountPaisa: 100000, minSubtotalPaisa: 200000, perCustomerLimit: 1 } });

  const cats = [
    { name: "Men", slug: "men" },
    { name: "Women", slug: "women" },
    { name: "Home & Kitchen", slug: "home-kitchen" },
    { name: "Electronics", slug: "electronics" },
  ];
  const catIds: Record<string, string> = {};
  for (const [i, c] of cats.entries()) {
    const row = await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: i } });
    catIds[c.slug] = row.id;
  }

  const products = [
    { name: "Cotton Kurta", slug: "cotton-kurta", cat: "men", price: 349900, compare: 449900, options: { Size: ["S", "M", "L", "XL"], Color: ["White", "Black"] }, stock: 12, featured: true },
    { name: "Embroidered Lawn Suit (3 Piece)", slug: "embroidered-lawn-suit", cat: "women", price: 699900, compare: null, options: { Size: ["S", "M", "L"] }, stock: 8, featured: true },
    { name: "Ceramic Dinner Set (24 Pieces)", slug: "ceramic-dinner-set", cat: "home-kitchen", price: 1299900, compare: 1499900, options: {}, stock: 5, featured: true },
    { name: "Wireless Earbuds", slug: "wireless-earbuds", cat: "electronics", price: 449900, compare: null, options: { Color: ["Black", "White"] }, stock: 20, featured: false },
    { name: "Leather Wallet", slug: "leather-wallet", cat: "men", price: 199900, compare: null, options: {}, stock: 3, featured: false },
    { name: "Non-stick Frying Pan 28cm", slug: "non-stick-frying-pan", cat: "home-kitchen", price: 289900, compare: 329900, options: {}, stock: 0, featured: false },
  ];

  for (const p of products) {
    if (await db.product.findUnique({ where: { slug: p.slug } })) continue;
    const optionEntries = Object.entries(p.options) as [string, string[]][];
    const product = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: `${p.name}. Demo product created by the seed script.\n\nCash refunds within 7 days if the item is unused.`,
        status: "ACTIVE",
        isFeatured: p.featured,
        categoryId: catIds[p.cat],
        options: { create: optionEntries.map(([name, values], position) => ({ name, position, values: { create: values.map((value, vp) => ({ value, position: vp })) } })) },
      },
      include: { options: { include: { values: true }, orderBy: { position: "asc" } } },
    });
    const lists = product.options.map((o) => o.values.sort((a, b) => a.position - b.position));
    const combos = lists.reduce<typeof lists[number][]>((acc, list) => acc.flatMap((a) => list.map((v) => [...a, v])), [[]]);
    for (const [i, combo] of combos.entries()) {
      const title = combo.length ? combo.map((v) => v.value).join(" / ") : "Default";
      const sku = `${p.slug.toUpperCase().slice(0, 16)}${combo.length ? "-" + combo.map((v) => v.value.toUpperCase().replace(/[^A-Z0-9]/g, "")).join("-") : ""}`;
      await db.productVariant.create({
        data: {
          productId: product.id,
          sku,
          title,
          pricePaisa: p.price,
          compareAtPricePaisa: p.compare,
          stock: p.stock,
          position: i,
          optionValues: { create: combo.map((v) => ({ optionValueId: v.id })) },
        },
      });
    }
    const total = p.stock * combos.length;
    await db.product.update({ where: { id: product.id }, data: { minPricePaisa: p.price, maxPricePaisa: p.price, totalStock: total } });
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
