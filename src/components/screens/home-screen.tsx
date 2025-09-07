
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament } from "@/lib/types";
import TournamentCard from "@/components/tournament-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

export default function HomeScreen() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "tournaments"));
        const allTournaments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
        
        // Filter and sort on the client-side to avoid composite indexes
        const publishedTournaments = allTournaments
          .filter(t => t.status === 'published')
          .sort((a, b) => b.date.toMillis() - a.date.toMillis());
          
        setTournaments(publishedTournaments);

      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTournaments();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="relative h-48 w-full overflow-hidden rounded-lg">
        <Image
            src="https://picsum.photos/800/400"
            alt="PUBG Banner"
            fill
            className="object-cover"
            data-ai-hint="game battle player"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-4xl font-black text-yellow-400 drop-shadow-lg">
              PUBG 1 STAR
            </h2>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
        <p className="text-muted-foreground">Join and compete in daily tournaments.</p>
      </div>


      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ))
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
            <h3 className="text-lg font-semibold">No Tournaments Available</h3>
            <p className="text-sm text-muted-foreground">Please check back later for new tournaments.</p>
          </div>
        ) : (
          tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))
        )}
      </div>
    </div>
  );
}

    