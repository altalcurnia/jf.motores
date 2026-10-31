import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Imágenes y modelos del catálogo servidos desde Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  // Nada del sitio original (legacy/) se publica: solo se usa como referencia.
};

export default nextConfig;
