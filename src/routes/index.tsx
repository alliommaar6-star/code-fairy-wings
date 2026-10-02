import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { StaffGate } from "../components/auth/StaffGate";

// Pull newest cloud data into the offline copy before the admin app reads it.
const App = lazy(async () => {
  const { startCloudSync } = await import("../lib/cloud-sync");
  await startCloudSync();
  return import("../App");
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Benadir Store" },
      {
        name: "description",
        content:
          "Benadir Store - Enterprise POS, Inventory, Sales, Financial Engine, and Customer Order Portal",
      },
      { property: "og:title", content: "Benadir Store" },
      {
        property: "og:description",
        content:
          "Benadir Store - Enterprise POS, Inventory, Sales, Financial Engine, and Customer Order Portal",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const loadingScreen = (
    <div className="fixed inset-0 flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-lg">
        ⚡
      </div>
      <h1 className="text-xl font-extrabold">BANADIR STORE</h1>
      <p className="mt-2 text-sm text-slate-300">System-ka waa furmayaa...</p>
      <div className="mt-5 h-1 w-36 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
      </div>
    </div>
  );

  if (!mounted) return loadingScreen;
  return (
    <StaffGate>
      <Suspense fallback={loadingScreen}>
        <App />
      </Suspense>
    </StaffGate>
  );
}
