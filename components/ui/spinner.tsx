import { Loader } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <div className="mt-32 flex flex-col items-center justify-center gap-4 text-white">
      <Loader className="w-8 h-8 animate-spin text-main" />
      <p className="font-medium">Securing your connection...</p>
    </div>
  );
}

export { Spinner };
