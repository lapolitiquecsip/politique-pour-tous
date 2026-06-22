"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ThumbsUp, ThumbsDown, CheckCircle2, XCircle } from "lucide-react";

interface LawAccordionsProps {
  pros: string[];
  cons: string[];
}

function AccordionSection({
  title,
  icon,
  children,
  colorScheme,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  colorScheme: "green" | "red";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const bgClass = colorScheme === "green" ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100";
  const hoverClass = colorScheme === "green" ? "hover:bg-green-50" : "hover:bg-red-50";

  return (
    <div className={`rounded-2xl border overflow-hidden ${bgClass}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-5 text-left font-bold text-lg transition-colors ${hoverClass}`}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LawAccordions({ pros, cons }: LawAccordionsProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">
        Pourquoi ça bloque (ou pas) ?
      </h2>

      <AccordionSection
        title="Arguments Pour"
        icon={<ThumbsUp className="w-5 h-5 text-green-600" />}
        colorScheme="green"
      >
        <ul className="space-y-3">
          {pros.length > 0 ? pros.map((pro, idx) => (
            <li key={idx} className="flex gap-2 text-green-900/80">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span>{pro}</span>
            </li>
          )) : (
            <li className="text-muted-foreground italic">Non renseigné.</li>
          )}
        </ul>
      </AccordionSection>

      <AccordionSection
        title="Arguments Contre"
        icon={<ThumbsDown className="w-5 h-5 text-red-600" />}
        colorScheme="red"
      >
        <ul className="space-y-3">
          {cons.length > 0 ? cons.map((con, idx) => (
            <li key={idx} className="flex gap-2 text-red-900/80">
              <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
              <span>{con}</span>
            </li>
          )) : (
            <li className="text-muted-foreground italic">Non renseigné.</li>
          )}
        </ul>
      </AccordionSection>
    </section>
  );
}
