// Starting templates. The store owner should review them (ideally with a lawyer) before launch.
export const DEFAULT_PAGES: { slug: string; title: string; sortOrder: number; content: string }[] = [
  {
    slug: "about-us",
    title: "About us",
    sortOrder: 0,
    content: `{{storeName}} is an online store delivering quality products to customers across Pakistan.

## Why shop with us
- Genuine products, checked before dispatch
- Delivery to all major cities in Pakistan
- Pay by card, JazzCash, Easypaisa, bank transfer or cash on delivery
- Friendly support on phone, WhatsApp and email`,
  },
  {
    slug: "contact-us",
    title: "Contact us",
    sortOrder: 1,
    content: `We are happy to help with orders, delivery and returns.

## Customer support
- Phone: {{supportPhone}}
- WhatsApp: {{whatsapp}}
- Email: {{supportEmail}}

## Address
{{address}}

Support hours: Monday to Saturday, 10:00 am to 6:00 pm (PKT).`,
  },
  {
    slug: "shipping-policy",
    title: "Shipping policy",
    sortOrder: 2,
    content: `## Delivery areas
We deliver across Pakistan through trusted courier partners.

## Delivery time
Orders are usually delivered within 2 to 5 working days in major cities and 5 to 7 working days elsewhere, after payment is confirmed (or after order confirmation for cash on delivery).

## Shipping charges
Shipping charges depend on your city and are shown at checkout before you pay.

## Tracking
Once your order ships, we email you the courier name and tracking number. You can also track your order on our website.`,
  },
  {
    slug: "return-refund-policy",
    title: "Return & refund policy",
    sortOrder: 3,
    content: `## Returns
You can request a return within 7 days of delivery if the item is unused, in its original packaging, and with all tags.

## Damaged or wrong items
If you receive a damaged, defective or wrong item, contact us within 48 hours of delivery with photos, and we will arrange a replacement or refund.

## Refunds
Approved refunds are issued to the original payment method or by bank transfer within 7 to 10 working days after we receive the returned item.

## How to request a return
Contact us at {{supportEmail}} or {{supportPhone}} with your order number.`,
  },
  {
    slug: "privacy-policy",
    title: "Privacy policy",
    sortOrder: 4,
    content: `{{storeName}} respects your privacy. This policy explains what we collect and why.

## Information we collect
- Name, phone number, email and delivery address you provide at checkout
- Order history and payment status (we never store your card details; card payments are processed by our payment partners)
- Basic, anonymous visit statistics to improve the store

## How we use it
- To process and deliver your orders and contact you about them
- To prevent fraud and comply with the law

## Sharing
We share your delivery details only with courier companies and payment providers needed to complete your order. We do not sell your data.

## Your choices
You can ask us to correct or delete your account information by emailing {{supportEmail}}.`,
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & conditions",
    sortOrder: 5,
    content: `By using this website and placing an order with {{storeName}}, you agree to these terms.

## Orders and prices
All prices are in Pakistani Rupees (PKR). We may cancel an order if a product is out of stock or a price was shown in error; any payment made is refunded in full.

## Payment
Orders paid online are confirmed after the payment is verified. Unpaid orders are cancelled automatically after the payment deadline.

## Delivery and returns
Delivery and returns are covered by our Shipping policy and Return & refund policy.

## Contact
Questions about these terms: {{supportEmail}}.`,
  },
];
