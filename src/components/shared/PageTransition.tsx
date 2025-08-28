"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: "-50px", once: true });
  
  return (
    <motion.div 
      ref={ref} 
      initial={{ opacity: 0, y: 8 }} 
      animate={inView ? { opacity: 1, y: 0 } : {}} 
      transition={{ duration: 0.25 }}
      className="contents"
    >
      {children}
    </motion.div>
  );
}
