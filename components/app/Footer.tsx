
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full z-50 bg-white/90 backdrop-blur-md border-t border-slate-100 fixed bottom-0 left-0">
      <div className="max-w-7xl mx-auto px-4 py-3 md:px-8">
        <div className="flex flex-col gap-y-3 md:flex-row md:justify-between md:items-center">
          
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Link href={"/"} className="text-[9px] md:text-[10px] font-bold text-dark uppercase tracking-widest opacity-60 whitespace-nowrap">
              © 2026 BiasBreaker
            </Link>
            <div className="h-3 w-px bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>
              <span className="text-[9px] md:text-[10px] font-medium text-slate-400 uppercase whitespace-nowrap">
                Live
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-1">
            <Link
              href="https://github.com/drjayaswal/biasbreaker-backend/blob/main/readme.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] md:text-[10px] font-bold text-slate-500 hover:text-main transition-colors uppercase tracking-tighter whitespace-nowrap"
            >
              Backend
            </Link>
            <Link
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] md:text-[10px] font-bold text-slate-500 hover:text-main transition-colors uppercase tracking-tighter whitespace-nowrap"
            >
              API Status
            </Link>
            <Link
              href="/developers"
              className="text-[9px] md:text-[10px] font-bold text-slate-500 hover:text-main transition-colors uppercase tracking-tighter whitespace-nowrap"
            >
              Developers
            </Link>
          </nav>
          
        </div>
      </div>
    </footer>
  );
};

export default Footer;