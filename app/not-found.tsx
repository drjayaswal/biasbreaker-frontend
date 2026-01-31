"use client";

import {
  ArrowRight,
  Cog,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatedButton } from "@/components/ui/animated-button";
import { motion } from "framer-motion";

export default function HeroSection() {
  const router = useRouter();

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-white font-sans">
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />
      <section className="relative z-10 max-w-4xl mx-auto text-center px-6 py-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-extrabold tracking-tight mb-8 text-8xl leading-tight"
        >
          404
        </motion.h1>
        <div className="flex flex-wrap items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AnimatedButton
              label="Home"
              onClick={() => router.push("/")}
              Icon={ArrowRight}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AnimatedButton
              label="Services"
              onClick={() => router.push("/")}
              Icon={Cog}
              rotateIcon 
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
