import { motion } from "framer-motion";

const barHeights = [28, 45, 35, 55, 42, 65, 50];

export default function ChartLoaderInline({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="flex items-end gap-1 h-16">
        {barHeights.map((maxH, i) => (
          <motion.div
            key={i}
            className="w-2 rounded-t-sm bg-primary"
            initial={{ height: 6 }}
            animate={{
              height: [6, maxH, maxH * 0.35, maxH * 1.05, 6],
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
