import { ProductDetail, productMetadata, productStaticParams } from "@/features/catalog/ProductDetail";

export const generateStaticParams = () => productStaticParams("motobomba");

export async function generateMetadata({ params }: PageProps<"/[lang]/motobombas/[slug]">) {
  return productMetadata("motobomba", (await params).slug);
}

export default async function Page({ params }: PageProps<"/[lang]/motobombas/[slug]">) {
  return <ProductDetail catalog="motobomba" slug={(await params).slug} />;
}
