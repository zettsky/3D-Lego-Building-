import type { Metadata } from "next";
import { getSet } from "@/data/catalog";
import { GuidedBuild } from "@/components/guided/GuidedBuild";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Build · ${getSet(id)?.name ?? "Set"}` };
}

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuidedBuild id={id} />;
}
