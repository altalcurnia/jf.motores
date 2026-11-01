import { CatalogListing, catalogMetadata } from "@/features/catalog/CatalogListing";

export const generateMetadata = () => catalogMetadata("all");

export default function Page({ searchParams }: PageProps<"/[lang]/catalogo">) {
  return <CatalogListing catalog="all" searchParams={searchParams} />;
}
