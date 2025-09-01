"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import AuthForm from "@/components/auth-form";
import BottomNav from "@/components/bottom-nav";
import HomeScreen from "@/components/screens/home-screen";
import WalletScreen from "@/components/screens/wallet-screen";
import MyTournamentsScreen from "@/components/screens/my-tournaments-screen";
import ProfileScreen from "@/components/screens/profile-screen";
import { Spinner } from "@/components/ui/spinner";
import { Gamepad2, Wallet, Swords, User } from "lucide-react";

type Screen = "home" | "wallet" | "tournaments" | "profile";

export default function Home() {
  const { user, loading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  const navItems = [
    { name: "home" as Screen, icon: Gamepad2, label: "Home" },
    { name: "wallet" as Screen, icon: Wallet, label: "Wallet" },
    { name: "tournaments" as Screen, icon: Swords, label: "My Tournaments" },
    { name: "profile" as Screen, icon: User, label: "Profile" },
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "home":
        return <HomeScreen />;
      case "wallet":
        return <WalletScreen />;
      case "tournaments":
        return <MyTournamentsScreen />;
      case "profile":
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-foreground">
      <main className="flex-1 pb-20">
        <div className="container mx-auto px-4 py-6">
            {renderScreen()}
        </div>
      </main>
      <BottomNav
        items={navItems}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
      />
    </div>
  );
}
