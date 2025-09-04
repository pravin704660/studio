
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Swords, Wallet, Bell, Trophy } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

export default function AdminPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || userProfile?.role !== 'admin')) {
      router.push('/');
    }
  }, [user, userProfile, loading, router]);

  if (loading || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // Only render the admin panel if the user is confirmed to be an admin
  if (userProfile.role === 'admin') {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              Back to App
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="container mx-auto">
              <h2 className="mb-6 text-3xl font-bold tracking-tight">Dashboard</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/users">
                  <Card className="cursor-pointer transition-colors hover:border-primary">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Manage Users</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <p className="text-xs text-muted-foreground">View and manage all registered users.</p>
                      </CardContent>
                  </Card>
                </Link>
                 <Link href="/admin/tournaments">
                  <Card className="cursor-pointer transition-colors hover:border-primary">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Manage Tournaments</CardTitle>
                          <Swords className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <p className="text-xs text-muted-foreground">Create, edit, and publish tournaments.</p>
                      </CardContent>
                  </Card>
                </Link>
                <Link href="/admin/mega-win">
                  <Card className="cursor-pointer transition-colors hover:border-primary">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Mega Win Tournament</CardTitle>
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <p className="text-xs text-muted-foreground">Manage special mega win tournaments.</p>
                      </CardContent>
                  </Card>
                </Link>
                <Link href="/admin/notifications">
                  <Card className="cursor-pointer transition-colors hover:border-primary">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Send Notifications</CardTitle>
                          <Bell className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <p className="text-xs text-muted-foreground">Send messages to all or specific users.</p>
                      </CardContent>
                  </Card>
                </Link>
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Wallet Requests</CardTitle>
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <p className="text-xs text-muted-foreground">Approve or reject user wallet top-ups.</p>
                      </CardContent>
                  </Card>
              </div>
          </div>
        </main>
      </div>
    );
  }

  // If the user is not an admin, we will have already redirected,
  // but as a fallback, we can return null.
  return null;
}
