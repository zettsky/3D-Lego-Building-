import { Suspense } from "react";
import type { Metadata } from "next";
import { ExploreClient } from "./ExploreClient";

export const metadata: Metadata = { title: "Explore sets" };

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreClient />
    </Suspense>
  );
}
