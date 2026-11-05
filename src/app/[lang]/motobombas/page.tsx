import { CatalogListing, catalogMetadata } from "@/features/catalog/CatalogListing";

export const generateMetadata = () => catalogMetadata("motobomba");

export default function Page({ searchParams }: PageProps<"/[lang]/motobombas">) {
  return <CatalogListing catalog="motobomba" searchParams={searchParams} />;
}
