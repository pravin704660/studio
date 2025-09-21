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
      <div className="flex justify-center">
        <Image
          src="/home/Homapageimage.jpg"
          alt="Homepage Banner"
          width={1600}
          height={900}
          className="w-full max-w-4xl h-auto object-contain rounded-lg"
          priority
        />
      </div> 
      
   </div>   <-- (the div that wraps the <Image .../>)
   paste the code below
*/

{/* Banner subtitle / single-line marquee */}
<div className="mt-4 flex items-center justify-center">
  <div
    className="w-full max-w-4xl overflow-hidden rounded-md bg-transparent"
    aria-hidden={false}
  >
    <div
      className="whitespace-nowrap py-3 text-center text-2xl font-extrabold tracking-wide"
      style={{
        color: "#FFD54F", /* yellow tone */
        opacity: 0.95,
      }}
    >
      {/* marquee inner: move left-to-right using CSS animation */}
      <div
        className="inline-block will-change-transform"
        style={{
          display: "inline-block",
          paddingLeft: "100%", // start off-screen right
          animation: "marquee 14s linear infinite",
        }}
      >
        YOUR WIN TOURNAMENTS
      </div>
    </div>
  </div>
</div>

{/* Add this <style jsx> (or put rules in globals.css) */}
<style jsx>{`
  @keyframes marquee {
    0% { transform: translateX(0%); }         /* starts off right because paddingLeft */
    100% { transform: translateX(-100%); }    /* move fully left */
  }

  /* smaller screens: make font smaller */
  @media (max-width: 640px) {
    .text-2xl { font-size: 1.125rem; } /* reduce a bit on mobile */
  }
`}</style>

      {/* Tournament Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center col-span-full">
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
