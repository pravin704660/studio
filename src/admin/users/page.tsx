
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, User, ShieldCheck, Wallet } from "lucide-react";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateWalletBalance } from "@/app/actions";

const PAGE_SIZE = 15;

export default function ManageUsersPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  const fetchUsers = async (initial = false) => {
    if (initial) {
      setLoading(true);
      setUsers([]);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const usersCollection = collection(db, "users");
      let q;
      if (lastDoc && !initial) {
        q = query(usersCollection, orderBy("name"), startAfter(lastDoc), limit(PAGE_SIZE));
      } else {
        q = query(usersCollection, orderBy("name"), limit(PAGE_SIZE));
      }

      const usersSnapshot = await getDocs(q);
      const newUsers = usersSnapshot.docs.map(
        (doc) => doc.data() as UserProfile
      );
      
      const lastVisible = usersSnapshot.docs[usersSnapshot.docs.length - 1];
      setLastDoc(lastVisible);

      if (newUsers.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setUsers(prev => initial ? newUsers : [...prev, ...newUsers]);

    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users.",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  const refreshUsers = () => {
    fetchUsers(true);
  }

  useEffect(() => {
    if (userProfile?.role === "admin") {
      refreshUsers();
    }
  }, [userProfile]);

  const toggleAdminRole = async (targetUser: UserProfile) => {
    if (user?.uid === targetUser.uid) {
        toast({
            variant: "destructive",
            title: "Action Forbidden",
            description: "You cannot change your own role.",
        });
        return;
    }
      
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      const userDocRef = doc(db, "users", targetUser.uid);
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: "Success",
        description: `${targetUser.name}'s role updated to ${newRole}.`,
      });
      refreshUsers(); // Refresh the list
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role.",
      });
      refreshUsers(); // Refresh the list after a failed update as well
    }
  };

  const handleOpenDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
    setAmount(0);
    setTransactionType('credit');
  };

  const handleWalletUpdate = async () => {
    if (!selectedUser || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a user and enter a valid amount.',
      });
      return;
    }
    setIsSubmitting(true);
    const result = await updateWalletBalance(selectedUser.uid, amount, transactionType);
    if (result.success) {
      toast({
        title: 'Success',
        description: `Wallet balance updated for ${selectedUser.name}.`,
      });
      refreshUsers();
      setIsDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
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
            <Link
              href="/admin"
              className="text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Manage Users</h1>
          </div>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.uid}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>₹{u.walletBalance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? <ShieldCheck className="mr-1 h-3 w-3"/> : <User className="mr-1 h-3 w-3"/>}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(u)}>
                            <Wallet className="mr-2 h-4 w-4" /> Manage Balance
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => toggleAdminRole(u)}
                          disabled={user?.uid === u.uid}
                          variant={u.role === "admin" ? "destructive" : "default"}
                        >
                          {u.role === "admin" ? "Revoke Admin" : "Make Admin"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasMore && (
                  <div className="mt-6 flex justify-center">
                      <Button onClick={() => fetchUsers()} disabled={loadingMore}>
                          {loadingMore ? <Spinner /> : "Load More"}
                      </Button>
                  </div>
              )}
            </>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Wallet for {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                />
              </div>
              <RadioGroup
                defaultValue="credit"
                value={transactionType}
                onValueChange={(value: 'credit' | 'debit') => setTransactionType(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit">Credit (Add)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit" id="debit" />
                  <Label htmlFor="debit">Debit (Subtract)</Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleWalletUpdate} disabled={isSubmitting}>
                    {isSubmitting ? <Spinner /> : 'Update Balance'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    