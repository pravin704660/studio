
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Swords, Wallet } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

export default function AdminPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // જ્યારે લોડિંગ પૂર્ણ થાય ત્યારે જ રીડાયરેક્શન હેન્ડલ કરો.
    if (!loading) {
      // જો વપરાશકર્તા લૉગ ઇન નથી અથવા એડમિન નથી, તો તેમને હોમ પેજ પર મોકલો.
      if (!user || userProfile?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, userProfile, loading, router]);

  // જ્યાં સુધી ઓથેન્ટિકેશન સ્ટેટસ અને યુઝર પ્રોફાઇલ લોડ ન થાય ત્યાં સુધી સ્પિનર બતાવો.
  // આનાથી યુઝરની ભૂમિકા કન્ફર્મ થયા પહેલાં અકાળે રીડાયરેક્ટ થતું અટકાવવામાં આવશે.
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // લોડિંગ પછી, જો વપરાશકર્તા એડમિન ન હોય, તો તેમને useEffect દ્વારા રીડાયરેક્ટ કરવામાં આવશે.
  // રીડાયરેક્શન પહેલાં એડમિન કન્ટેન્ટને ક્ષણભર માટે રેન્ડર થતું અટકાવવા માટે આપણે અહીં null રિટર્ન કરી શકીએ છીએ.
  if (!user || userProfile?.role !== 'admin') {
    return null; 
  }
  
  // જો લોડિંગ false હોય અને વપરાશકર્તા એડમિન હોય, તો એડમિન પેનલ રેન્ડર કરો.
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manage Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">View and manage all registered users.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manage Tournaments</CardTitle>
                        <Swords className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Create, edit, and publish tournaments.</p>
                    </CardContent>
                </Card>
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
