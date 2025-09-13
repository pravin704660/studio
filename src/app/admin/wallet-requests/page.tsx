
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { WalletRequest } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
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
import { updateWalletRequestStatus } from "@/app/actions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function WalletRequestsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  useEffect(() => {
    if (userProfile?.role === "admin") {
      const q = query(collection(db, "wallet_requests"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => doc.data() as WalletRequest);
        setRequests(requestsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching wallet requests:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch wallet requests." });
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [userProfile, toast]);

  const handleUpdateStatus = async (
    request: WalletRequest,
    newStatus: 'approved' | 'rejected'
  ) => {
    setIsSubmitting(request.requestId);
    const result = await updateWalletRequestStatus(
      request.requestId,
      request.userId,
      request.amount,
      newStatus
    );
    if (result.success) {
      toast({ title: "Success", description: `Request has been ${newStatus}.` });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
    setIsSubmitting(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }
  
  const renderRequestsTable = (filteredRequests: WalletRequest[]) => {
      if (filteredRequests.length === 0) {
          return <p className="text-center text-muted-foreground p-8">No requests in this category.</p>
      }
      return (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>UTR</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.requestId}>
                    <TableCell className="min-w-[150px]">{req.userName || req.userEmail}</TableCell>
                    <TableCell>₹{req.amount}</TableCell>
                    <TableCell>{req.utr}</TableCell>
                    <TableCell className="min-w-[180px]">{req.timestamp.toDate().toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={
                        req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'
                      }>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-500 border-green-500 hover:bg-green-500 hover:text-white"
                            onClick={() => handleUpdateStatus(req, 'approved')}
                            disabled={isSubmitting === req.requestId}
                          >
                            {isSubmitting === req.requestId ? <Spinner size="sm" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(req, 'rejected')}
                            disabled={isSubmitting === req.requestId}
                          >
                             {isSubmitting === req.requestId ? <Spinner size="sm" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Wallet Requests</h1>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto">
            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">{renderRequestsTable(requests.filter(r => r.status === 'pending'))}</TabsContent>
                <TabsContent value="approved">{renderRequestsTable(requests.filter(r => r.status === 'approved'))}</TabsContent>
                <TabsContent value="rejected">{renderRequestsTable(requests.filter(r => r.status === 'rejected'))}</TabsContent>
                <TabsContent value="all">{renderRequestsTable(requests)}</TabsContent>
            </Tabs>
        </div>
      </main>
    </div>
  );
}
