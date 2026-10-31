import { CatalogPlaceholder, catalogMetadata } from "@/components/CatalogPlaceholder";

export const generateMetadata = () => catalogMetadata("motobombas");

export default function Page() {
  return <CatalogPlaceholder catalog="motobombas" />;
}
