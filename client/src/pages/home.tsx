import { useEffect } from "react";
import { useLocation } from "wouter";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  // Show loading state if checking auth
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26A69A]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="my-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Welcome to BlockBots</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          The platform to create, control, and interact with Minecraft agents.
          Join now to start building your own Minecraft automation.
        </p>
      </div>
      
      <AuthTabs />
    </div>
  );
}
