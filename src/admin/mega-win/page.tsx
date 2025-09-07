
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament, TournamentFormData } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Trash2, Trophy } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrUpdateTournament, deleteTournament } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const initialFormData: Omit<TournamentFormData, 'id' | 'date' | 'imageUrl'> & { date: string } = {
  title: "",
  gameType: "Solo",
  date: "",
  time: "",
  entryFee: 0,
  slots: 100,
  prize: 0,
  rules: '',
  status: "draft",
  isMega: true,
};


export default function ManageMegaWinTournamentsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const tournamentsCollection = collection(db, "tournaments");
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      const allTournaments = tournamentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tournament));
      // Filter on the client-side to avoid composite indexes
      const megaTournaments = allTournaments.filter(t => t.isMega);
      setTournaments(megaTournaments);
    } catch (error) {
       console.error("Error fetching mega tournaments:", error);
       toast({ variant: "destructive", title: "Error", description: "Failed to fetch mega tournaments." });
    } finally {
      setLoading(false);
    }
  };
  
  const refreshTournaments = () => {
      fetchTournaments();
  }

  useEffect(() => {
    if (userProfile?.role === "admin") {
      fetchTournaments();
    }
  }, [userProfile, toast]);
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value 
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill out title, date and time." });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const tournamentDataForAction: TournamentFormData = {
        ...formData,
        isMega: true,
      };
      
      const result = await createOrUpdateTournament(tournamentDataForAction);

      if (result.success) {
        toast({ title: "Success", description: "Mega Tournament saved successfully." });
        setIsDialogOpen(false);
        setFormData(initialFormData);
        refreshTournaments();
      } else {
        throw new Error(result.error || "Failed to create tournament.");
      }
    } catch (error: any) {
        console.error("Detailed Error:", error);
        let description = "An unknown error occurred. Please check the console for more details.";
        if (error.message) {
            description = error.message;
        }
        toast({ variant: "destructive", title: "Error creating tournament", description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tournamentId: string) => {
    setIsDeleting(true);
    const result = await deleteTournament(tournamentId);
    if (result.success) {
      toast({ title: "Success", description: "Tournament deleted successfully." });
      refreshTournaments();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
    setIsDeleting(false);
  };

  if (authLoading || userProfile?.role !== "admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  const getDisplayDate = (date: any) => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString();
    }
    return 'Invalid Date';
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Mega Win Tournaments</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Mega Tournament
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create New Mega Tournament</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2">
                    <ScrollArea className="h-full pr-4">
                        <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" name="title" value={formData.title} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input id="date" name="date" type="date" value={formData.date} onChange={handleFormChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="time">Time</Label>
                                <Input id="time" name="time" type="time" value={formData.time} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entryFee">Entry Fee</Label>
                                <Input id="entryFee" name="entryFee" type="number" value={formData.entryFee} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prize">Prize Pool</Label>
                                <Input id="prize" name="prize" type="number" value={formData.prize} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select onValueChange={(v) => handleSelectChange('status', v)} defaultValue={formData.status}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Spinner size="sm" className="mr-2" /> Submitting...</> : 'Save Tournament'}
                            </Button>
                        </form>
                    </ScrollArea>
                </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
            {loading ? (
                <div className="flex justify-center"><Spinner size="lg" /></div>
            ) : tournaments.length === 0 ? (
                 <Card className="mt-6">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Trophy className="h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Mega Tournaments Found</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create a new mega tournament to get started.
                        </p>
                    </CardContent>
                 </Card>
            ) : (
              <>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry Fee</TableHead>
                        <TableHead>Prize</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {tournaments.map((t) => (
                        <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>{getDisplayDate(t.date)}</TableCell>
                        <TableCell>₹{t.entryFee}</TableCell>
                        <TableCell>₹{t.prize}</TableCell>
                        <TableCell>
                            <Badge variant={t.status === "published" ? "default" : "secondary"}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={isDeleting}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    tournament and remove all related data.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(t.id)}>
                                    {isDeleting ? <Spinner /> : "Delete"}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </>
            )}
        </div>
      </main>
    </div>
  );
}
