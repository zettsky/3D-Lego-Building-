import type { Metadata } from "next";
import { getSet } from "@/data/catalog";
import { SetDetails } from "./SetDetails";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: getSet(id)?.name ?? "Set" };
}

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SetDetails id={id} />;
}
