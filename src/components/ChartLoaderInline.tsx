import { motion } from "framer-motion";

export default function ChartLoaderInline({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <motion.div
        className="text-4xl"
        initial={{ y: 30, opacity: 0 }}
        animate={{
          y: [30, -15, -8, -50],
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
      {text && (
        <motion.p
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
