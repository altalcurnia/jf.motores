import { CatalogListing, catalogMetadata } from "@/features/catalog/CatalogListing";

export const generateMetadata = () => catalogMetadata("repuesto");

export default function Page({ searchParams }: PageProps<"/[lang]/repuestos">) {
  return <CatalogListing catalog="repuesto" searchParams={searchParams} />;
}
