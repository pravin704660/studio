"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
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
        const tournamentsCollection = collection(db, "tournaments");
        const q = query(tournamentsCollection, orderBy("date", "desc"));
        
        const querySnapshot = await getDocs(q);
        const allTournaments = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Tournament)
        );

        const publishedTournaments = allTournaments.filter(
          (t) => t.status === "published"
        );

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
      {/* Banner */}
      {/* ✅ Image WELCOME ની નીચે */}
      <div className="container mx-auto px-4 mt-4">
        <Image
          src="/home/Homapageimage.jpg"
          alt="Homepage Banner"
          width={1200}
          height={400}
          className="w-full max-w-3xl mx-auto rounded-lg object-cover"
          priority
        />
      </div>
      {/* Tournament Cards */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border bg-card p-4"
            >
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
            <p className="text-sm text-muted-foreground">
              Please check back later for new tournaments.
            </p>
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
