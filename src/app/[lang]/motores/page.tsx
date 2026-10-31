import { CatalogListing, catalogMetadata } from "@/features/catalog/CatalogListing";

export const generateMetadata = () => catalogMetadata("motor");

export default function Page({ searchParams }: PageProps<"/[lang]/motores">) {
  return <CatalogListing catalog="motor" searchParams={searchParams} />;
}
