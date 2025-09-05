
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { WalletRequest } from "@/lib/types";
import { getUtrFollowUpMessage } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Spinner } from "./ui/spinner";

export default function UtrFollowUpNotifier() {
  const { user } = useAuth();
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkPendingRequests = async () => {
      setLoading(true);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const q = query(
        collection(db, "wallet_requests"),
        where("userId", "==", user.uid),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(q);
      const oldPendingRequests = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as WalletRequest))
        .filter(req => req.timestamp.toDate() < twentyFourHoursAgo);

      if (oldPendingRequests.length > 0) {
        // We only need to show one message, so we'll use the first old request
        const request = oldPendingRequests[0];
        const message = await getUtrFollowUpMessage({
          requestId: request.requestId,
          userId: request.userId,
          amount: request.amount,
          utr: request.utr,
          timestamp: request.timestamp.toDate().toISOString(),
        });

        if (message && message !== "No follow-up needed yet.") {
          setFollowUpMessage(message);
        }
      }
      setLoading(false);
    };

    checkPendingRequests();
  }, [user]);

  if (loading) {
    return (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            <span>Checking for pending requests...</span>
        </div>
    );
  }

  if (!followUpMessage) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Action Required</AlertTitle>
      <AlertDescription>{followUpMessage}</AlertDescription>
    </Alert>
  );
}
