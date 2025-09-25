"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament, TournamentFormData, WinnerPrize } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Trash2, Pencil, Plus, X } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 10;

const initialFormData: Omit<TournamentFormData, 'id' | 'date'> & { date: string } = {
  title: "",
  gameType: "Solo",
  date: "",
  time: "",
  entryFee: 0,
  slots: 100,
  prize: 0,
  rules: '',
  status: "draft",
  isMega: false,
  roomId: "",
  roomPassword: "",
  winnerPrizes: [
    { rank: '1st', prize: 0 },
    { rank: '2nd', prize: 0 },
    { rank: '3rd', prize: 0 },
    { rank: '4th', prize: 0 },
  ],
};

export default function ManageTournamentsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<TournamentFormData & { date: string }>(initialFormData as TournamentFormData & { date: string });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  const fetchTournaments = async (initial = false) => {
    if (initial) {
        setLoading(true);
        setTournaments([]);
        setLastDoc(null);
        setHasMore(true);
    } else {
        setLoadingMore(true);
    }

    try {
        const tournamentsCollection = collection(db, "tournaments");
        let q;
        if (lastDoc && !initial) {
            q = query(tournamentsCollection, where("isMega", "==", false), orderBy("date", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
        } else {
            q = query(tournamentsCollection, where("isMega", "==", false), orderBy("date", "desc"), limit(PAGE_SIZE));
        }

        const tournamentsSnapshot = await getDocs(q);
        
        const newTournaments = tournamentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tournament));

        const lastVisible = tournamentsSnapshot.docs[tournamentsSnapshot.docs.length - 1];
        setLastDoc(lastVisible);

        if (newTournaments.length < PAGE_SIZE) {
            setHasMore(false);
        }

        setTournaments(prev => initial ? newTournaments : [...prev, ...newTournaments]);
    } catch (error: any) {
        console.error("Error fetching tournaments:", error);
        toast({ variant: "destructive", title: "Error", description: `Failed to fetch tournaments. ${error.message}` });
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };
  
  const refreshTournaments = () => {
    fetchTournaments(true);
  }

  useEffect(() => {
    if (userProfile?.role === "admin") {
      refreshTournaments();
    }
  }, [userProfile]);

  const handleOpenNewDialog = () => {
    setEditingTournamentId(null);
    setFormData(initialFormData as TournamentFormData & { date: string });
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id);
    const handleOpenEditDialog = (tournament: Tournament) => {
  setEditingTournamentId(tournament.id);

  // Firestore Timestamp → JS Date
  const date =
    tournament.date instanceof Timestamp
      ? tournament.date.toDate()
      : new Date(tournament.date);

  // ✅ Proper strings banavo
  const dateString = date.toISOString().split("T")[0]; // yyyy-mm-dd
  const timeString = date.toTimeString().slice(0, 5);  // HH:MM

  setFormData({
    ...tournament,
    date: dateString,       // 👈 હવે khali નહિ રહે
    time: timeString,       // 👈 time field prefill થશે
    rules: Array.isArray(tournament.rules)
      ? tournament.rules.join("\n")
      : tournament.rules,
    winnerPrizes:
      tournament.winnerPrizes && tournament.winnerPrizes.length > 0
        ? tournament.winnerPrizes
        : initialFormData.winnerPrizes,
  });
};
    setImageFile(null);
    setIsDialogOpen(true);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
    }));
  };

  const handlePrizeChange = (index: number, field: keyof WinnerPrize, value: string | number) => {
    const newPrizes = [...(formData.winnerPrizes || [])];
    (newPrizes[index] as any)[field] = field === 'prize' ? (value === '' ? 0 : Number(value)) : value;
    setFormData(prev => ({ ...prev, winnerPrizes: newPrizes }));
  };

  const addPrizeField = () => {
    setFormData(prev => ({
      ...prev,
      winnerPrizes: [...(prev.winnerPrizes || []), { rank: '', prize: 0 }]
    }));
  };
  
  const removePrizeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      winnerPrizes: prev.winnerPrizes?.filter((_, i) => i !== index)
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setImageFile(e.target.files[0]);
    }
  };
  
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time) {
        toast({ variant: "destructive", title: "Missing Fields", description: "Please fill out title, date and time." });
        return;
    }
    
    setIsSubmitting(true);

    try {
      const data = new FormData();
      if (imageFile) {
        data.append('imageFile', imageFile);
      }
      
      const tournamentDataForAction: TournamentFormData = {
        ...formData,
        isMega: false,
        winnerPrizes: formData.winnerPrizes?.filter(p => p.rank && p.prize > 0),
      };
      if (editingTournamentId) {
        tournamentDataForAction.id = editingTournamentId;
      }

      data.append('tournamentData', JSON.stringify(tournamentDataForAction));
      
      const result = await createOrUpdateTournament(data);

      if (result.success) {
        toast({ title: "Success", description: "Tournament saved successfully." });
        setIsDialogOpen(false);
        refreshTournaments();
      } else {
        throw new Error(result.error || "Failed to save tournament.");
      }
    } catch(error: any) {
        console.error("Detailed Error saving tournament:", error);
        let description = "An unknown error occurred. Please check the console for more details.";
        if (error.message) {
            description = error.message;
        }
        toast({ variant: "destructive", title: "Error saving tournament", description });
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
            <h1 className="text-2xl font-bold">Manage Tournaments</h1>
          </div>
          <Button onClick={handleOpenNewDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Tournament
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex justify-center"><Spinner size="lg" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                        <TableCell className="font-medium min-w-[200px]">{t.title}</TableCell>
                        <TableCell>{getDisplayDate(t.date)}</TableCell>
                        <TableCell>₹{t.entryFee}</TableCell>
                        <TableCell>₹{t.prize}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "published" ? "default" : "secondary"}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(t)}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
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
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                    <Button onClick={() => fetchTournaments()} disabled={loadingMore}>
                        {loadingMore ? <Spinner /> : "Load More"}
                    </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>{editingTournamentId ? 'Edit Tournament' : 'Create New Tournament'}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <ScrollArea className="h-full pr-4">
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" value={formData.title} onChange={handleFormChange} />
                        </div>
                          <div className="space-y-2">
                            <Label htmlFor="image">Image</Label>
                            <Input id="image" name="imageFile" type="file" accept="image/*" onChange={handleImageChange} />
                              <p className="text-xs text-muted-foreground">Upload a new image or leave blank to keep the existing one.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="date">Date</Label>
                              <Input id="date" name="date" type="date" value={formData.date} onChange={handleFormChange} />
                          </div>
                            <div className="space-y-2">
                              <Label htmlFor="time">Time</Label>
                              <Input id="time" name="time" type="time" value={formData.time} onChange={handleFormChange} />
                          </div>
                        </div>
                          <div className="space-y-2">
                              <Label htmlFor="rules">Rules (one per line)</Label>
                              <Textarea id="rules" name="rules" value={formData.rules as string} onChange={handleFormChange} rows={4} />
                          </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="entryFee">Entry Fee</Label>
                              <Input id="entryFee" name="entryFee" type="number" value={formData.entryFee} onChange={handleFormChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="prize">Prize Pool</Label>
                              <Input id="prize" name="prize" type="number" value={formData.prize} onChange={handleFormChange} />
                          </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="slots">Slots</Label>
                            <Input id="slots" name="slots" type="number" value={formData.slots} onChange={handleFormChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="roomId">Room ID</Label>
                              <Input id="roomId" name="roomId" value={formData.roomId} onChange={handleFormChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="roomPassword">Room Password</Label>
                              <Input id="roomPassword" name="roomPassword" value={formData.roomPassword} onChange={handleFormChange} />
                          </div>
                        </div>
                        <div className="space-y-4 rounded-md border p-4">
                          <Label>Winner Prizes</Label>
                          {formData.winnerPrizes?.map((prize, index) => (
                              <div key={index} className="flex items-center gap-2">
                                  <Input 
                                      placeholder="Rank (e.g., 5th)" 
                                      value={prize.rank}
                                      onChange={(e) => handlePrizeChange(index, 'rank', e.target.value)}
                                  />
                                  <Input 
                                      type="number" 
                                      placeholder="Prize Amount"
                                      value={prize.prize}
                                      onChange={(e) => handlePrizeChange(index, 'prize', e.target.value)}
                                  />
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removePrizeField(index)}>
                                      <X className="h-4 w-4" />
                                  </Button>
                              </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={addPrizeField}>
                              <Plus className="mr-2 h-4 w-4" /> Add Prize
                          </Button>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select onValueChange={(v) => handleSelectChange('status', v)} value={formData.status}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="live">Live</SelectItem>
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
  );
}
