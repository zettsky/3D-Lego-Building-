"use client";
import { useEffect, useState } from "react";
import { ldrawMeshesReady, loadLdrawMeshes, onLdrawMeshes } from "../ldraw/meshes";

/** Starts loading the LDraw meshes and re-renders once they are available. */
export function useLdrawReady(): boolean {
  const [ready, setReady] = useState(ldrawMeshesReady());
  useEffect(() => {
    if (ready) return;
    const off = onLdrawMeshes(() => setReady(true));
    loadLdrawMeshes();
    return () => {
      off();
    };
  }, [ready]);
  return ready;
}
