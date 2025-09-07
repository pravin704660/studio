
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament, PlayerResult, TournamentResult } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Trash2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { declareResult } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ManageResultsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [results, setResults] = useState<PlayerResult[]>([{ playerName: "", points: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  }, [userProfile]);
  
  const handleOpenDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setResults([{ playerName: "", points: 0 }]);
    setIsDialogOpen(true);
  };
  
  const handleResultChange = (index: number, field: keyof PlayerResult, value: string | number) => {
    const newResults = [...results];
    (newResults[index] as any)[field] = value;
    setResults(newResults);
  };
  
  const addPlayerRow = () => {
    setResults([...results, { playerName: "", points: 0 }]);
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
        .map(r => ({ ...r, points: Number(r.points) }));

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
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Declare Results for {selectedTournament?.title}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                  <ScrollArea className="h-full pr-4">
                      <div className="space-y-4 py-4">
                        {results.map((result, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input 
                                    placeholder="Player Name"
                                    value={result.playerName}
                                    onChange={(e) => handleResultChange(index, 'playerName', e.target.value)}
                                />
                                <Input 
                                    type="number"
                                    placeholder="Points"
                                    value={result.points}
                                    onChange={(e) => handleResultChange(index, 'points', e.target.value)}
                                />
                                <Button variant="destructive" size="icon" onClick={() => removePlayerRow(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={addPlayerRow}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Player
                        </Button>
                      </div>
                  </ScrollArea>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleFormSubmit} disabled={isSubmitting}>
                      {isSubmitting ? <Spinner /> : "Submit Results"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
