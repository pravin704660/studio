
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Trash2, Inbox } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { deleteUserNotifications } from "@/app/actions";
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

type Screen = "home" | "wallet" | "mega-result" | "tournaments" | "profile" | "rules" | "inbox";

interface InboxScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

export default function InboxScreen({ setActiveScreen }: InboxScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inbox:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load your inbox." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleClearAll = async () => {
    if (!user) return;
    setIsClearing(true);
    const result = await deleteUserNotifications(user.uid);
    if (result.success) {
      toast({ title: "Inbox Cleared", description: "All your personal messages have been deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
    setIsClearing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveScreen("profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={notifications.filter(n => n.userId === user?.uid).length === 0 || isClearing}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Personal
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your personal messages. Global announcements will not be affected. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>
                {isClearing ? <Spinner size="sm" /> : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Spinner size="lg" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start space-x-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {n.timestamp ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Your inbox is empty</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You'll find messages and announcements here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
