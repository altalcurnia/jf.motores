import { CatalogPlaceholder, catalogMetadata } from "@/components/CatalogPlaceholder";

export const generateMetadata = () => catalogMetadata("motores");

export default function Page() {
  return <CatalogPlaceholder catalog="motores" />;
}
