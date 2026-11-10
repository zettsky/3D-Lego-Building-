import DevStep from "./DevStep";

export const metadata = { title: "Step viewer (development)" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DevStep id={id} />;
}
