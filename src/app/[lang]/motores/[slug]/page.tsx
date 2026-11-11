import { ProductDetail, productMetadata, productStaticParams } from "@/features/catalog/ProductDetail";

export const generateStaticParams = () => productStaticParams("motor");

export async function generateMetadata({ params }: PageProps<"/[lang]/motores/[slug]">) {
  return productMetadata("motor", (await params).slug);
}

export default async function Page({ params }: PageProps<"/[lang]/motores/[slug]">) {
  return <ProductDetail catalog="motor" slug={(await params).slug} />;
}
