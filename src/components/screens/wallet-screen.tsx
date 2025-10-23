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
import { submitWalletRequest, submitWithdrawalRequest } from "@/app/actions";
import { Spinner } from "../ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction, AppConfig } from "@/lib/types";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import UtrFollowUpNotifier from "../utr-follow-up-notifier";
import { Skeleton } from "../ui/skeleton";
import { ClipboardCopy } from "lucide-react";

const DEFAULT_UPI_ID = "8155966320";
const DEFAULT_QR_IMAGE_URL = "/done.png";

export default function WalletScreen() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // Add money state
  const [addAmount, setAddAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  // Withdraw money state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpiId, setWithdrawUpiId] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setConfigLoading(true);
      try {
        const configDoc = await getDoc(doc(db, "config", "payment"));
        if (configDoc.exists()) {
          const configData = configDoc.data() as AppConfig;
          setPaymentConfig(configData);
        } else {
          setPaymentConfig({ upiId: DEFAULT_UPI_ID, qrImageUrl: DEFAULT_QR_IMAGE_URL });
        }
      } catch (error) {
        console.error("Failed to fetch payment config", error);
        setPaymentConfig({ upiId: DEFAULT_UPI_ID, qrImageUrl: DEFAULT_QR_IMAGE_URL });
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
    setIsAddingMoney(true);

    try {
      const result = await submitWalletRequest(
        user.uid,
        parseFloat(addAmount),
        utr
      );
      if (result.success) {
        toast({
          title: "Request Submitted",
          description: "Your request to add money is pending approval.",
        });
        setAddAmount("");
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
      setIsAddingMoney(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsWithdrawing(true);

    try {
      const result = await submitWithdrawalRequest(
        user.uid,
        parseFloat(withdrawAmount),
        withdrawUpiId
      );
      if (result.success) {
        toast({
          title: "Request Submitted",
          description: "Your withdrawal request is pending approval.",
        });
        setWithdrawAmount("");
        setWithdrawUpiId("");
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
      setIsWithdrawing(false);
    }
  };

  const handleCopyUpi = () => {
    const upiId = paymentConfig?.upiId || DEFAULT_UPI_ID;
    navigator.clipboard.writeText(upiId);
    toast({
      title: "UPI ID Copied!",
      description: `${upiId} has been copied to your clipboard.`,
    });
  };

  const qrImageUrlToShow = (paymentConfig?.qrImageUrl && paymentConfig.qrImageUrl.trim() !== '') ? paymentConfig.qrImageUrl : DEFAULT_QR_IMAGE_URL;

  // ⭐️⭐️⭐️ નવું UPI Deep Link ફંક્શન અહીં ઉમેરવામાં આવ્યું છે ⭐️⭐️⭐️
  const generateUpiLink = (amount: string, upiId: string, merchantName: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return '#';
    
    // MerchantName ને URL માટે એન્કોડ કરો
    const encodedName = encodeURIComponent(merchantName);

    // સામાન્ય UPI લિંક જે મોબાઇલ પર એપ ખોલશે
    return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${numAmount.toFixed(2)}&cu=INR`;
  };
  // ⭐️⭐️⭐️ નવું UPI Deep Link ફંક્શન અહીં સમાપ્ત થાય છે ⭐️⭐️⭐️


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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add_money">Add Money</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="add_money" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Funds to Wallet</CardTitle>
              <CardDescription>
                Enter the amount, use the direct link to pay, and then enter the UTR code below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* ⭐️⭐️⭐️ Amount Input ને અહીંયા ફોર્મની ઉપર મૂકવામાં આવ્યું છે ⭐️⭐️⭐️ */}
              <div className="space-y-1">
                  <Label htmlFor="addAmount">Amount</Label>
                  <Input
                    id="addAmount"
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
              </div>
              
              {/* QR કોડ અને UPI ID (જેમ છે તેમ) */}
              {configLoading ? (
                 <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted p-4">
                    <Skeleton className="h-[200px] w-[200px] rounded-md" />
                    <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 rounded-lg bg-muted p-4">
                    <img
                      src={qrImageUrlToShow}
                      alt="QR Code" 
                      width={200} 
                      height={200} 
                      className="rounded-md" 
                    />
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{paymentConfig?.upiId || DEFAULT_UPI_ID}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyUpi}>
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                </div>
              )}
              
              {/* ⭐️⭐️⭐️ UPI Deep Link Buttons અહીં ઉમેરવામાં આવ્યા છે ⭐️⭐️⭐️ */}
              {addAmount && parseFloat(addAmount) > 0 && (
                  <div className="space-y-2 pt-2">
                      <p className="font-semibold text-center text-sm text-primary">
                          Pay ₹{parseFloat(addAmount).toFixed(2)} directly using:
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                          
                          {/* Google Pay Button */}
                          <a 
                            href={generateUpiLink(addAmount, paymentConfig?.upiId || DEFAULT_UPI_ID, "Arena Ace")} 
                            target="_self" 
                            className="w-full h-10 flex items-center justify-center rounded-lg bg-[#4285F4] text-white font-bold text-sm"
                          >
                            GPay
                          </a>
                          
                          {/* PhonePe Button */}
                          <a 
                            href={generateUpiLink(addAmount, paymentConfig?.upiId || DEFAULT_UPI_ID, "Arena Ace")} 
                            target="_self"
                            className="w-full h-10 flex items-center justify-center rounded-lg bg-[#6739B7] text-white font-bold text-sm"
                          >
                            PhonePe
                          </a>
                          
                          {/* Paytm Button */}
                          <a 
                            href={generateUpiLink(addAmount, paymentConfig?.upiId || DEFAULT_UPI_ID, "Arena Ace")} 
                            target="_self"
                            className="w-full h-10 flex items-center justify-center rounded-lg bg-[#00B9F1] text-white font-bold text-sm"
                          >
                            Paytm
                          </a>
                      </div>
                      <p className="mt-2 text-center text-xs text-red-400">
                         Payment કર્યા પછી, 12-અંકનો UTR કોપી કરીને નીચે દાખલ કરો.
                      </p>
                  </div>
              )}
              {/* ⭐️⭐️⭐️ UPI Deep Link Buttons અહીં સમાપ્ત થાય છે ⭐️⭐️⭐️ */}

              {/* UTR Submission Form */}
              <form onSubmit={handleAddMoney} className="space-y-4">
                {/* ❌ Amount Input અહીંયાથી દૂર કરવામાં આવ્યું છે */}
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
                <Button type="submit" className="w-full" disabled={isAddingMoney || !addAmount}>
                  {isAddingMoney ? <Spinner /> : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Withdraw Funds</CardTitle>
                    <CardDescription>
                        Enter the amount you wish to withdraw and your UPI ID.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="withdrawAmount">Amount</Label>
                            <Input
                                id="withdrawAmount"
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Enter amount"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="withdrawUpiId">Your UPI ID</Label>
                            <Input
                                id="withdrawUpiId"
                                type="text"
                                value={withdrawUpiId}
                                onChange={(e) => setWithdrawUpiId(e.target.value)}
                                placeholder="Enter your UPI ID for payment"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isWithdrawing}>
                            {isWithdrawing ? <Spinner /> : "Submit Withdrawal Request"}
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
