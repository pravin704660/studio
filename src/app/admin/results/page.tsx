
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament, PlayerResult, UserProfile, Entry } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Trash2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { declareResult } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ManageResultsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPlayers, setIsFetchingPlayers] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  const fetchCompletedTournaments = async () => {
    setLoading(true);
    try {
      const tournamentsCollection = collection(db, "tournaments");
      const q = query(tournamentsCollection, where("status", "==", "completed"));
      const tournamentsSnapshot = await getDocs(q);
      const tournamentsList = tournamentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tournament));
      setTournaments(tournamentsList);
    } catch (error) {
      console.error("Error fetching completed tournaments:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch completed tournaments." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "admin") {
      fetchCompletedTournaments();
    }
  }, [userProfile, toast]);
  
  const handleOpenDialog = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsDialogOpen(true);
    setIsFetchingPlayers(true);
    setResults([]);
    
    try {
        const entriesQuery = query(collection(db, "entries"), where("tournamentId", "==", tournament.id));
        const entriesSnapshot = await getDocs(entriesQuery);
        const entries = entriesSnapshot.docs.map(doc => doc.data() as Entry);

        if (entries.length === 0) {
            toast({ variant: "destructive", title: "No Participants", description: "No users have joined this tournament." });
            setResults([]);
            return;
        }
        
        const playerPromises = entries.map(async (entry) => {
            const userDoc = await getDoc(doc(db, "users", entry.userId));
            if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                return {
                    userId: userData.uid,
                    playerName: userData.name || "N/A",
                    pubgId: userData.pubgId || "N/A",
                    points: 0,
                };
            }
            return null;
        });

        const resolvedPlayers = (await Promise.all(playerPromises)).filter(p => p !== null) as PlayerResult[];
        setResults(resolvedPlayers);
    } catch (error) {
        console.error("Error fetching participants:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch tournament participants." });
    } finally {
        setIsFetchingPlayers(false);
    }
  };
  
  const handleResultChange = (index: number, field: keyof PlayerResult, value: string | number) => {
    const newResults = [...results];
    (newResults[index] as any)[field] = value;
    setResults(newResults);
  };
  
  const addPlayerRow = () => {
    setResults([...results, { userId: "", playerName: "", pubgId: "", points: 0 }]);
  };

  const removePlayerRow = (index: number) => {
    const newResults = results.filter((_, i) => i !== index);
    setResults(newResults);
  };
  
  const handleFormSubmit = async () => {
    if (!selectedTournament) return;
    setIsSubmitting(true);

    const finalResults = results
        .filter(r => r.playerName.trim() !== "")
        .map(r => ({ ...r, points: Number(r.points) || 0 }));

    const result = await declareResult(selectedTournament.id, selectedTournament.title, finalResults);
    
    if (result.success) {
      toast({ title: "Success", description: "Results declared successfully." });
      setIsDialogOpen(false);
      setSelectedTournament(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
    
    setIsSubmitting(false);
  };

  if (authLoading || userProfile?.role !== "admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Declare Results</h1>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
            {loading ? (
                <div className="flex justify-center"><Spinner size="lg" /></div>
            ) : tournaments.length === 0 ? (
                 <Card className="mt-6">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Award className="h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Completed Tournaments</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Once a tournament is marked as 'completed', you can declare its results here.
                        </p>
                    </CardContent>
                 </Card>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tournament Title</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tournaments.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.title}</TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => handleOpenDialog(t)}>Declare Result</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Declare Results for {selectedTournament?.title}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                  <ScrollArea className="h-full pr-4">
                      <div className="space-y-4 py-4">
                        {isFetchingPlayers ? (
                           <div className="flex justify-center items-center h-40">
                                <Spinner />
                                <p className="ml-2">Fetching participants...</p>
                           </div>
                        ) : results.length > 0 ? (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Player Name</TableHead>
                                       <TableHead>PUBG ID</TableHead>
                                       <TableHead className="w-24">Points</TableHead>
                                       <TableHead className="w-12"></TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {results.map((result, index) => (
                                       <TableRow key={index}>
                                           <TableCell className="font-medium">{result.playerName}</TableCell>
                                           <TableCell>{result.pubgId}</TableCell>
                                           <TableCell>
                                                <Input 
                                                    type="number"
                                                    placeholder="Points"
                                                    value={result.points}
                                                    onChange={(e) => handleResultChange(index, 'points', e.target.value)}
                                                    className="w-24"
                                                />
                                           </TableCell>
                                            <TableCell>
                                                <Button variant="destructive" size="icon" onClick={() => removePlayerRow(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        ) : (
                           <p className="text-center text-muted-foreground p-8">No participants found for this tournament.</p>
                        )}
                        <Button variant="outline" onClick={addPlayerRow}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Player Manually
                        </Button>
                      </div>
                  </ScrollArea>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleFormSubmit} disabled={isSubmitting || isFetchingPlayers}>
                      {isSubmitting ? <Spinner /> : "Submit Results"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

    