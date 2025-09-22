"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, PlusCircle, Trash2, Pencil } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { deleteTournament } from "@/app/actions";

const PAGE_SIZE = 10;

export default function ManageTournamentsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Dialog states
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [joinedUsers, setJoinedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ✅ Protect admin route
  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  // ✅ Fetch tournaments
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
        q = query(
          tournamentsCollection,
          where("isMega", "==", false),
          orderBy("date", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          tournamentsCollection,
          where("isMega", "==", false),
          orderBy("date", "desc"),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const newTournaments = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Tournament)
      );

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(lastVisible);

      if (newTournaments.length < PAGE_SIZE) setHasMore(false);

      setTournaments((prev) => (initial ? newTournaments : [...prev, ...newTournaments]));
    } catch (error: any) {
      console.error("Error fetching tournaments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch tournaments. ${error.message}`,
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "admin") {
      fetchTournaments(true);
    }
  }, [userProfile]);

  // ✅ Fetch joined users
  const fetchJoinedUsers = async (tournamentId: string) => {
    setLoadingUsers(true);
    try {
      const usersCollection = collection(db, "tournaments", tournamentId, "joinedUsers");
      const snapshot = await getDocs(usersCollection);
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJoinedUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ✅ Delete tournament
  const handleDelete = async (id: string) => {
    try {
      await deleteTournament(id);
      setTournaments((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Deleted", description: "Tournament deleted successfully." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete tournament. ${error.message}`,
      });
    }
  };

  const getDisplayDate = (date: any) => {
    if (!date) return "N/A";
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString() : "Invalid Date";
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
            <h1 className="text-2xl font-bold">Manage Tournaments</h1>
          </div>
          <Button onClick={() => toast({ title: "Coming Soon", description: "Tournament create/edit feature already available." })}>
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
                        <Badge variant={t.status === "published" ? "default" : "secondary"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex justify-end items-center gap-2">
  {/* ✏ Edit */}
  <Button variant="outline" size="icon">
    <Pencil className="h-4 w-4" />
  </Button>

  {/* 👥 View Users */}
  <Button
    variant="default"
    className="px-3"
    onClick={() => {
      setSelectedTournamentId(t.id);
      fetchJoinedUsers(t.id);
      setIsUsersDialogOpen(true);
    }}
  >
    👥 View Users
  </Button>

  {/* 🗑 Delete */}
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="icon">
        <Trash2 className="h-4 w-4" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete the tournament and all related data.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={() => handleDelete(t.id)}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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

      {/* 👥 Joined Users Dialog */}
      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Joined Users ({joinedUsers.length}/
              {tournaments.find((x) => x.id === selectedTournamentId)?.slots || 0} slots)
            </DialogTitle>
          </DialogHeader>

          {loadingUsers ? (
            <Spinner size="lg" />
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {joinedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users joined yet.</p>
              ) : (
                joinedUsers.map((user, idx) => (
                  <div key={user.id} className="flex justify-between border p-2 rounded">
                    <span>{idx + 1}. {user.username || user.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email || ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
