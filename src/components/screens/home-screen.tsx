"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex justify-center">
        <Image
          src="/home/Homapageimage.jpg"
          alt="Homepage Banner"
          width={1200}
          height={500}
          className="w-full max-w-3xl h-auto object-cover rounded-lg"
          priority
        />
      </div>

      {/* Tournament Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-md border bg-card p-3">
              <Skeleton className="h-28 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          ))
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-8 text-center">
            <h3 className="text-sm font-semibold">No Tournaments Available</h3>
            <p className="text-xs text-muted-foreground">
              Please check back later for new tournaments.
            </p>
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="p-3 rounded-md border bg-card shadow-sm space-y-2"
            >
              <img
                src={tournament.imageUrl || "/home/Homapageimage.jpg"}
                alt={tournament.title}
                className="w-full h-28 object-cover rounded-md"
              />
              <h3 className="text-sm font-semibold truncate">
                {tournament.title}
              </h3>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>₹{tournament.entryFee}</span>
                <span>{tournament.slots} Slots</span>
              </div>
              <Button size="sm" className="w-full">
                Join
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
