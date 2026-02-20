import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  GitBranch,
  Shield,
  Zap,
  Globe,
  Target,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: GitBranch,
    title: "Smart Split Testing",
    description: "Distribua tráfego entre variantes com pesos configuráveis e auto-otimização baseada em conversão.",
  },
  {
    icon: Target,
    title: "Tracking Avançado",
    description: "Rastreamento completo com click_id, UTMs, geolocalização, dispositivo e detecção anti-fraude.",
  },
  {
    icon: BarChart3,
    title: "Analytics em Tempo Real",
    description: "Métricas de conversão, faturamento, ticket médio e receita por visita com gráficos temporais.",
  },
  {
    icon: Shield,
    title: "Anti-Fraude Integrado",
    description: "Detecção de bots, blacklist automática e separação de métricas brutas vs filtradas.",
  },
  {
    icon: Zap,
    title: "Redirect Ultra-Rápido",
    description: "HTTP 302 server-side com latência mínima. Registro assíncrono do click antes do redirect.",
  },
  {
    icon: Globe,
    title: "Multi-Tenant",
    description: "Isolamento total por organização. Suporte a múltiplos usuários, roles e API keys.",
  },
];

const stats = [
  { value: "< 50ms", label: "Latência de redirect" },
  { value: "99.9%", label: "Uptime garantido" },
  { value: "∞", label: "Eventos processados" },
  { value: "A/B", label: "Teste estatístico" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              Nexus <span className="gradient-text">Metrics</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Login</Link>
            </Button>
            <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90" asChild>
              <Link to="/dashboard">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,41,36,0.08)_0%,_transparent_60%)]" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 text-xs text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full gradient-bg animate-pulse-glow" />
              Tracking profissional para tráfego pago
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Split Test &<br />
              <span className="gradient-text">Analytics Avançado</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              O tracker profissional que faltava. Redirect server-side ultra-rápido, 
              atribuição inteligente e otimização automática de variantes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 px-8" asChild>
                <Link to="/dashboard">
                  Criar conta grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-border hover:bg-accent" asChild>
                <Link to="/dashboard">Ver demo</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mt-16"
            initial="hidden"
            animate="visible"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={i + 2}
                className="text-center p-4 rounded-lg bg-card/50 border border-border/50"
              >
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              Tudo que você precisa para <span className="gradient-text">escalar</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Arquitetura modular e robusta preparada para alto volume de tráfego pago.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg gradient-bg-soft flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/30">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center p-12 rounded-2xl border border-border/50 bg-card relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,41,36,0.06)_0%,_transparent_70%)]" />
            <div className="relative">
              <TrendingUp className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-3">
                Comece a otimizar seu tráfego agora
              </h2>
              <p className="text-muted-foreground mb-6">
                Configure seu primeiro split test em menos de 2 minutos.
              </p>
              <Button size="lg" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 px-8" asChild>
                <Link to="/dashboard">
                  Criar conta grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span>Nexus Metrics</span>
          </div>
          <span>© 2026 Nexus Metrics. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
