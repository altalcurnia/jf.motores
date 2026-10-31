import { CatalogPlaceholder, catalogMetadata } from "@/components/CatalogPlaceholder";

export const generateMetadata = () => catalogMetadata("repuestos");

export default function Page() {
  return <CatalogPlaceholder catalog="repuestos" />;
}
