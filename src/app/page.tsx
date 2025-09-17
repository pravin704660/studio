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
import { Gamepad2, Wallet, Swords, Trophy, Youtube } from "lucide-react";
import NotificationBell from "@/components/notification-bell";
import MegaResultScreen from "@/components/screens/mega-result-screen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import RulesScreen from "@/components/screens/rules-screen";
import InboxScreen from "@/components/screens/inbox-screen";

type Screen = "home" | "wallet" | "mega-result" | "tournaments" | "profile" | "rules" | "inbox";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  const navItems = [
    { name: "home" as Screen, icon: Gamepad2, label: "Home" },
    { name: "tournaments" as Screen, icon: Swords, label: "My Tournaments" },
    { name: "mega-result" as Screen, icon: Trophy, label: "Mega Result" },
    { name: "wallet" as Screen, icon: Wallet, label: "Wallet" },
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
  
  const getInitials = (name: string | null | undefined) => {
    if (!name || name === 'New User') return null;
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "home":
        return <HomeScreen />;
      case "wallet":
        return <WalletScreen />;
      case "mega-result":
        return <MegaResultScreen />;
      case "tournaments":
        return <MyTournamentsScreen />;
      case "profile":
        return <ProfileScreen setActiveScreen={setActiveScreen} />;
      case "rules":
        return <RulesScreen setActiveScreen={setActiveScreen} />;
      case "inbox":
        return <InboxScreen setActiveScreen={setActiveScreen} />;
      default:
        return <HomeScreen />;
    }
  };
  
  const initials = getInitials(userProfile?.name);

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex-1 flex justify-start">
             <Button variant="ghost" className="h-10 w-10 p-0 rounded-full" onClick={() => setActiveScreen("profile")}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={userProfile?.photoUrl || ''} alt={userProfile?.name || 'User'} />
                <AvatarFallback>
                    {initials ? initials : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight text-yellow-400">WELCOME</h1>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            <a href="https://shorturl.at/NbYgS" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon">
                <Youtube className="h-6 w-6 text-red-600" />
              </Button>
            </a>
            <NotificationBell />
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20">
        <div className="container mx-auto px-4 py-6">
            {renderScreen()}
        </div> 
        <a
  href="/app-release.apk"
  download
  className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
>
  📥 Download APK
</a>
      </main>
      <BottomNav
        items={navItems}
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
      />
    </div>
  );
}
