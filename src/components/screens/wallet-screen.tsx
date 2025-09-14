
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { submitWalletRequest } from "@/app/actions";
import { Spinner } from "../ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import type { Transaction, AppConfig } from "@/lib/types";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import UtrFollowUpNotifier from "../utr-follow-up-notifier";
import { Skeleton } from "../ui/skeleton";

export default function WalletScreen() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setConfigLoading(true);
      try {
        const configDoc = await getDoc(doc(db, "config", "payment"));
        if (configDoc.exists()) {
          setPaymentConfig(configDoc.data() as AppConfig);
        } else {
          setPaymentConfig({ upiId: "", qrImageUrl: "" }); // Set default empty config
        }
      } catch (error) {
        console.error("Failed to fetch payment config", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load payment information.",
        });
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const trans: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            trans.push({ txnId: doc.id, ...doc.data() } as Transaction);
        });
        setTransactions(trans.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()));
    });
    
    return () => unsubscribe();
  }, [user]);


  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const result = await submitWalletRequest(
        user.uid,
        parseFloat(amount),
        utr
      );
      if (result.success) {
        toast({
          title: "Request Submitted",
          description: "Your request to add money is pending approval.",
        });
        setAmount("");
        setUtr("");
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Could not submit your request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardDescription>Current Balance</CardDescription>
          <CardTitle className="text-5xl font-extrabold tracking-tighter">
            ₹{userProfile?.walletBalance.toFixed(2) ?? "0.00"}
          </CardTitle>
        </CardHeader>
      </Card>

      <UtrFollowUpNotifier />

      <Tabs defaultValue="add_money">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add_money">Add Money</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="add_money" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Funds to Wallet</CardTitle>
              <CardDescription>
                Scan the QR or use the UPI ID to pay, then enter the transaction details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configLoading ? (
                 <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted p-4">
                    <Skeleton className="h-[200px] w-[200px] rounded-md" />
                    <Skeleton className="h-4 w-48" />
                </div>
              ) : paymentConfig ? (
                <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted p-4">
                    {paymentConfig.qrImageUrl ? (
                      <Image src={paymentConfig.qrImageUrl} alt="QR Code" width={200} height={200} className="rounded-md" data-ai-hint="qr code"/>
                    ) : <p className="text-sm text-muted-foreground p-4">QR Code not available</p> }
                    <p className="font-mono text-sm">{paymentConfig.upiId || 'UPI ID not available'}</p>
                </div>
              ) : (
                 <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground p-4">Payment details are not configured yet.</p>
                 </div>
              )}
              <form onSubmit={handleAddMoney} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="utr">UTR Code</Label>
                  <Input
                    id="utr"
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="Enter UTR code"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Spinner /> : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length > 0 ? (
                        <ul className="space-y-3">
                            {transactions.map(tx => (
                                <li key={tx.txnId} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                    <div>
                                        <p className="font-semibold capitalize">{tx.description}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(tx.timestamp.toMillis()).toLocaleString()}</p>
                                    </div>
                                    <div className={`font-bold text-right ${tx.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                        <p className={`text-xs font-normal capitalize ${
                                            tx.status === 'success' ? 'text-green-500' : tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                                        }`}>{tx.status}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground">No transactions yet.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
