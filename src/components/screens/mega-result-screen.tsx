
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { TournamentResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Trophy } from "lucide-react";

export default function MegaResultScreen() {
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMegaResults = async () => {
      setLoading(true);
      try {
        const resultsCollection = collection(db, "results");
        // The query now only filters, sorting is done client-side
        const q = query(
          resultsCollection,
          where("isMega", "==", true)
        );

        const querySnapshot = await getDocs(q);
        const megaResults = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as TournamentResult)
        );
        
        // Sort the results in descending order by declaredAt date on the client
        megaResults.sort((a, b) => b.declaredAt.toMillis() - a.declaredAt.toMillis());
        
        setResults(megaResults);
      } catch (error) {
        console.error("Error fetching mega results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMegaResults();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Mega Results</h1>
      <p className="text-muted-foreground">
        Check out the winners of our mega tournaments.
      </p>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="mt-6">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </CardContent>
          </Card>
        ))
      ) : results.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="h-16 w-16 text-yellow-400" />
            <h3 className="mt-4 text-lg font-semibold">No Mega Results Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Results for mega tournaments will be displayed here once they are
              declared.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id}>
              <CardHeader>
                <CardTitle>{result.tournamentTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.results.slice(0, 4).map((player, index) => (
                    <li
                      key={player.userId}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Award
                          className={`h-6 w-6 ${
                            index === 0
                              ? "text-yellow-400"
                              : index === 1
                              ? "text-gray-400"
                              : index === 2
                              ? "text-orange-400"
                              : "text-blue-400"
                          }`}
                        />
                        <div>
                          <p className="font-semibold">{player.playerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Rank: #{player.rank}
                          </p>
                        </div>
                      </div>
                      <div className="font-bold">
                        {player.points} Points
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
