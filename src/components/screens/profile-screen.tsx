"use client";

import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Mail } from "lucide-react";

export default function ProfileScreen() {
  const { user, userProfile } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user || !userProfile) {
    return null; // or a loading spinner
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      
      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={userProfile.photoUrl || ''} alt={userProfile.name || 'User'} />
            <AvatarFallback className="text-3xl font-bold">
                {getInitials(userProfile.name)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="mt-4 text-2xl">{userProfile.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 rounded-md bg-muted p-3">
                <Mail className="h-5 w-5 text-muted-foreground"/>
                <span className="text-sm">{userProfile.email}</span>
            </div>
             <div className="flex items-center space-x-3 rounded-md bg-muted p-3">
                <User className="h-5 w-5 text-muted-foreground"/>
                <span className="text-sm capitalize">{userProfile.role}</span>
            </div>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
