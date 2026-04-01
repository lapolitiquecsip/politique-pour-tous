"use client";

import { useTheme } from "@/components/providers";
import { Sun, Moon, Laptop } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-secondary/50 border border-border animate-pulse" />
    );
  }

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center transition-all duration-300 group overflow-hidden"
      title={`Thème actuel: ${theme}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "system" ? (
          <motion.div
            key="system"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2 }}
          >
            <Laptop className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        ) : resolvedTheme === "dark" ? (
          <motion.div
            key="dark"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-5 h-5 text-blue-400 fill-blue-400 group-hover:text-blue-300 transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="light"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-5 h-5 text-amber-500 fill-amber-500 group-hover:text-amber-400 transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/20 scale-x-0 group-hover:scale-x-75 transition-transform duration-300" />
    </button>
  );
}
