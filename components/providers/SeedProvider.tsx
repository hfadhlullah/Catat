"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SeedProvider() {
  const seed = useMutation(api.categories.seedDefaultCategories);

  useEffect(() => {
    seed().catch(() => {}); // idempotent, safe to call every mount
  }, []);

  return null;
}
