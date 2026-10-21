const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    // Diretivas de baixo risco que não bloqueiam scripts/estilos do Next.js.
    key: "Content-Security-Policy",
    value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // Importação de mini simulados do Word envia imagens de questões por server action.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async redirects() {
    // A aba "Mini Simulados" virou "Diagnóstico Semanal" e o diagnóstico mensal virou "Relatório".
    return [
      { source: "/aluno/mini-simulados/diagnostico", destination: "/aluno/relatorio", permanent: false },
      { source: "/aluno/mini-simulados", destination: "/aluno/diagnostico-semanal", permanent: false },
      { source: "/aluno/mini-simulados/:path*", destination: "/aluno/diagnostico-semanal/:path*", permanent: false },
    ]
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
