
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament, Entry, TournamentResult } from "@/lib/types";
import TournamentCard from "@/components/tournament-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award } from "lucide-react";

interface JoinedTournament extends Tournament {
  entryStatus: Entry['status'];
}

export default function MyTournamentsScreen() {
  const { user } = useAuth();
  const [joinedTournaments, setJoinedTournaments] = useState<JoinedTournament[]>([]);
  const [results, setResults] = useState<{[key: string]: TournamentResult}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const fetchJoinedTournamentsAndResults = async () => {
      setLoading(true);
      try {
        const entriesQuery = query(collection(db, "entries"), where("userId", "==", user.uid));
        const entriesSnapshot = await getDocs(entriesQuery);
        const entries = entriesSnapshot.docs.map(doc => doc.data() as Entry);

        if (entries.length === 0) {
            setJoinedTournaments([]);
            setLoading(false);
            return;
        }
        
        const tournamentPromises = entries.map(async (entry) => {
            try {
                const tourneyDoc = await getDoc(doc(db, "tournaments", entry.tournamentId));
                if (tourneyDoc.exists()) {
                    return { ...tourneyDoc.data() as Tournament, id: tourneyDoc.id, entryStatus: entry.status };
                }
            } catch (error) {
                console.error(`Failed to fetch tournament ${entry.tournamentId}:`, error);
            }
            return null;
        });
        
        const resolvedTournaments = (await Promise.all(tournamentPromises)).filter(t => t !== null) as JoinedTournament[];
        setJoinedTournaments(resolvedTournaments);

        // Fetch results for completed tournaments
        const completedTournamentIds = resolvedTournaments
            .filter(t => t.status === 'completed')
            .map(t => t.id);

        if (completedTournamentIds.length > 0) {
            const resultsData: {[key: string]: TournamentResult} = {};
            for (const id of completedTournamentIds) {
                const resultDoc = await getDoc(doc(db, "results", id));
                if (resultDoc.exists()) {
                    resultsData[id] = { id: resultDoc.id, ...resultDoc.data() } as TournamentResult;
                }
            }
            setResults(resultsData);
        }

      } catch (error) {
        console.error("Error fetching joined tournaments:", error);
        setJoinedTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedTournamentsAndResults();
  }, [user]);

  const upcoming = joinedTournaments.filter(t => t.status === 'published');
  const live = joinedTournaments.filter(t => t.status === 'live');
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
      return tournaments.map(t => (
          <div key={t.id} className="space-y-4">
            <TournamentCard tournament={t} showCredentials={true} />
            {t.status === 'completed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Result: {t.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {results[t.id] ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead className="text-right">Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results[t.id].results.map((playerResult, index) => (
                          <TableRow key={playerResult.userId || index}>
                            <TableCell className="font-bold">#{playerResult.rank}</TableCell>
                            <TableCell>{playerResult.playerName}</TableCell>
                            <TableCell className="text-right">{playerResult.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground">Results not declared yet.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
      ));
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
