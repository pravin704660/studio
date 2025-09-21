"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogOut,
  User,
  Mail,
  Shield,
  Gamepad2,
  Edit,
  Save,
  X,
  FileText,
  Inbox,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { Spinner } from "../ui/spinner";
import { Input } from "../ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfileName } from "@/app/actions";

type Screen =
  | "home"
  | "wallet"
  | "mega-result"
  | "tournaments"
  | "profile"
  | "rules"
  | "inbox";

interface ProfileScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

export default function ProfileScreen({ setActiveScreen }: ProfileScreenProps) {
  const { user, userProfile, loading } = useAuth();
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(userProfile?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.name) {
      setName(userProfile.name);
    }
  }, [userProfile?.name]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleNameSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const result = await updateUserProfileName(user.uid, name);
    if (result.success) {
      toast({ title: "Success", description: "Your name has been updated." });
      setIsEditingName(false);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
    setIsSaving(false);
  };

  // 🔹 Share handler
  const handleShare = async (platform?: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to share.",
      });
      return;
    }

    const apkLink = `${window.location.origin}/PUBG1STAR.apk`;
    const referralLink = `${window.location.origin}/?ref=${user.uid}`;
    const referralText = `🔥 Join me on PUBG1STAR and get ₹10 bonus!\n\n📥 Download APK: ${apkLink}\n👉 Referral Link: ${referralLink}`;

    // ✅ Custom platform links
    if (platform === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(referralText)}`,
        "_blank"
      );
      return;
    }
    if (platform === "telegram") {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(
          referralLink
        )}&text=${encodeURIComponent(referralText)}`,
        "_blank"
      );
      return;
    }
    if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          referralLink
        )}`,
        "_blank"
      );
      return;
    }

    // ✅ Default system share (for mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "PUBG1STAR Referral",
          text: referralText,
          url: referralLink,
        });
      } catch (error) {
        console.error("Share cancelled:", error);
      }
    } else {
      // fallback (desktop copy link)
      try {
        await navigator.clipboard.writeText(referralText);
        toast({
          title: "Link Copied!",
          description:
            "Referral text copied to clipboard. Paste it in WhatsApp/Telegram to share.",
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not copy the link.",
        });
      }
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
        <h3 className="text-lg font-semibold">Could not load profile</h3>
        <p className="text-sm text-muted-foreground">
          Please try logging out and logging back in.
        </p>
        <Button
          variant="destructive"
          className="mt-4 w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    );
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name || name === "New User") return null;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const initials = getInitials(userProfile.name);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage
              src={userProfile.photoUrl || ""}
              alt={userProfile.name || "User"}
            />
            <AvatarFallback className="text-3xl font-bold">
              {initials ? initials : <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>
          <div className="mt-4 flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold text-center"
                />
                <Button size="icon" onClick={handleNameSave} disabled={isSaving}>
                  {isSaving ? <Spinner size="sm" /> : <Save className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setIsEditingName(false);
                    setName(userProfile.name || "");
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 rounded-md bg-muted p-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">{userProfile.email}</span>
          </div>
          <div className="flex items-center space-x-3 rounded-md bg-muted p-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm capitalize">{userProfile.role}</span>
          </div>
          {userProfile.pubgId && (
            <div className="flex items-center space-x-3 rounded-md bg-muted p-3">
              <Gamepad2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{userProfile.pubgId}</span>
            </div>
          )}

          {userProfile.role === "admin" && (
            <Link href="/admin" passHref>
              <Button variant="outline" className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}

          {/* 🔹 Share buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleShare()}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Refer &amp; Earn (System Share)
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleShare("whatsapp")}
            >
              Share on WhatsApp
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleShare("telegram")}
            >
              Share on Telegram
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleShare("facebook")}
            >
              Share on Facebook
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setActiveScreen("rules")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Rules
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setActiveScreen("inbox")}
          >
            <Inbox className="mr-2 h-4 w-4" />
            Inbox
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
