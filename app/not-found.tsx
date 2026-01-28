"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="fixed mx-auto flex flex-col items-center justify-center w-full overflow-hidden pt-50">

      <div className="relative z-10 text-center">
        <h1 className="text-[12rem] font-black leading-none text-main select-none opacity-20 blur-[2px] absolute -top-24 left-1/2 -translate-x-1/2 z-0">
          404
        </h1>
        
        <div className="relative z-10">
          <h2 className="text-5xl font-bold text-main tracking-tighter mb-4">
            Lost in the Void
          </h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto mb-10 font-light">
            The page you are looking for doesn't exist or has been moved to a different dimension.
          </p>

          <Link href="/">
            <Button
              variant="ghost"
              className="w-full h-12 bg-transparent hover:bg-linear-to-r hover:from-white hover:via-main/80 hover:to-white hover:text-white text-main font-bold rounded-none duration-300 transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors mt-4"
            >
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}