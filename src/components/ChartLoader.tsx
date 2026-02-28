import { motion } from "framer-motion";

const barHeights = [40, 65, 50, 80, 60, 95, 75];
const barColors = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.9)",
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary))",
];

export default function ChartLoader({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="flex items-end gap-1.5 h-24">
        {barHeights.map((maxH, i) => (
          <motion.div
            key={i}
            className="w-3 rounded-t-sm"
            style={{ background: barColors[i] }}
            initial={{ height: 8 }}
            animate={{
              height: [8, maxH, maxH * 0.4, maxH * 1.1, 8],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.p
        className="text-sm text-muted-foreground font-medium"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {text}
      </motion.p>
    </div>
  );
}
