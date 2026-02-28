import { motion } from "framer-motion";

export default function ChartLoader({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <motion.div
        className="text-5xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{
          y: [40, -20, -10, -60],
          opacity: [0, 1, 1, 0],
          rotate: [0, -5, 5, 0],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🚀
      </motion.div>
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
