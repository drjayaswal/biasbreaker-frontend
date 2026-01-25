"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user_email", data.email);

        toast.success(data.message || "Welcome!");

        setTimeout(() => {
          router.push("/");
          window.location.href = "/";
        }, 500);
      }
    } catch (error: any) {
      toast.error(error.message || "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden">
      <div className="relative z-10 w-full min-w-md mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-main">Sign In</h1>
          <p className="text-main text-sm mt-2 font-medium">
            Enter email and password to continue
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl text-main placeholder:text-shadow border-2 border-transparent focus-visible:border-main/30 focus-visible:ring-0 transition-all shadow-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl text-main placeholder:text-shadow border-2 border-transparent focus-visible:border-main/30 focus-visible:ring-0 transition-all shadow-none"
              required
            />
          </div>

          <Button
            type="submit"
            variant={"ghost"}
            className="w-full h-12 bg-transparent hover:bg-linear-to-r hover:from-white hover:via-main/80 hover:to-white hover:text-white text-main font-bold rounded-none duration-300 transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors mt-4"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
