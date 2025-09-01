"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament, Entry } from "@/lib/types";
import TournamentCard from "@/components/tournament-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface JoinedTournament extends Tournament {
  entryStatus: Entry['status'];
}

export default function MyTournamentsScreen() {
  const { user } = useAuth();
  const [joinedTournaments, setJoinedTournaments] = useState<JoinedTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const fetchJoinedTournaments = async () => {
      try {
        const entriesQuery = query(collection(db, "entries"), where("userId", "==", user.uid));
        const entriesSnapshot = await getDocs(entriesQuery);
        const entries = entriesSnapshot.docs.map(doc => doc.data() as Entry);

        if (entries.length === 0) {
            setJoinedTournaments([]);
            return;
        }
        
        const tournamentPromises = entries.map(async (entry) => {
            const tourneyDoc = await getDoc(doc(db, "tournaments", entry.tournamentId));
            if (tourneyDoc.exists()) {
                return { ...tourneyDoc.data() as Tournament, id: tourneyDoc.id, entryStatus: entry.status };
            }
            return null;
        });

        const tournamentsData = (await Promise.all(tournamentPromises)).filter(t => t !== null) as JoinedTournament[];
        setJoinedTournaments(tournamentsData);
      } catch (error) {
        console.error("Error fetching joined tournaments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedTournaments();
  }, [user]);

  const upcoming = joinedTournaments.filter(t => t.status === 'published');
  const live = joinedTournaments.filter(t => t.status === 'live'); // Assuming a 'live' status
  const completed = joinedTournaments.filter(t => t.status === 'completed');

  const renderList = (tournaments: JoinedTournament[]) => {
      if (loading) {
          return Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="mt-4 space-y-3 rounded-lg border bg-card p-4">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ));
      }
      if (tournaments.length === 0) {
          return <p className="mt-8 text-center text-muted-foreground">No tournaments in this category.</p>;
      }
      return tournaments.map(t => <TournamentCard key={t.id} tournament={t} />);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">My Tournaments</h1>
      <p className="text-muted-foreground">Here are the tournaments you've joined.</p>

      <Tabs defaultValue="upcoming" className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4">{renderList(upcoming)}</TabsContent>
        <TabsContent value="live" className="space-y-4">{renderList(live)}</TabsContent>
        <TabsContent value="completed" className="space-y-4">{renderList(completed)}</TabsContent>
      </Tabs>
    </div>
  );
}
