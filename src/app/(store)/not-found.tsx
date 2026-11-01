import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
      <Link href="/" className="mt-6 inline-block font-medium text-brand-700 hover:underline">Back to home</Link>
    </div>
  );
}
