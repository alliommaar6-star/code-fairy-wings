import PortalApp from "./PortalApp";

export default function PortalEntry({ token }: { token: string }) {
  return <PortalApp token={token} />;
}
