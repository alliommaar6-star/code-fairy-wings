import { createFileRoute } from "@tanstack/react-router";
import PortalEntry from "../components/portal/PortalEntry";

export const Route = createFileRoute("/payment/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Banadir Store — Lacag Bixin" },
      { name: "description", content: "Bixi dalabkaaga Banadir Store si degdeg ah oo ammaan ah." },
      { property: "og:title", content: "Banadir Store — Lacag Bixin" },
      { property: "og:description", content: "Faahfaahinta dalabkaaga iyo lacag bixinta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentRoute,
});

function PaymentRoute() {
  const { token } = Route.useParams();
  return <PortalEntry token={token} />;
}
