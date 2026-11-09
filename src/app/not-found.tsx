import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="label text-terracotta">Page 404</span>
      <h1 className="font-serif text-5xl tracking-tight">This page fell behind the sofa.</h1>
      <p className="text-ink-soft/80">Like every lost brick, it’s probably somewhere. Meanwhile:</p>
      <Link href="/" className="btn btn-primary">Back to the workshop</Link>
    </div>
  );
}
