import { Suspense } from "react";
import type { Metadata } from "next";
import { getSet } from "@/data/catalog";
import { CustomBuild } from "@/components/studio/CustomBuild";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Studio · ${getSet(id)?.name ?? "Set"}` };
}

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <CustomBuild id={id} />
    </Suspense>
  );
}
