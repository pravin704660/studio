
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { deleteUserNotification } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "./ui/spinner";

const SEEN_GLOBAL_NOTIFS_KEY = "seenGlobalNotifIds";

export default function NotificationBell() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [seenGlobalIds, setSeenGlobalIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);


  useEffect(() => {
      try {
          const storedIds = localStorage.getItem(SEEN_GLOBAL_NOTIFS_KEY);
          if (storedIds) {
              setSeenGlobalIds(new Set(JSON.parse(storedIds)));
          }
      } catch (error) {
          console.error("Failed to parse seen notifications from localStorage", error);
      }
  }, []);
  
  useEffect(() => {
    if (authLoading || !user || !userProfile) return;

    // Use a single query with 'in' to fetch both user-specific and global notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        setError(null); // Clear previous errors on new data
        const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        setNotifications(fetchedNotifications);
        
        // Recalculate unread count based on the new data
        let localSeenGlobalIds = new Set<string>();
        try {
            const storedIds = localStorage.getItem(SEEN_GLOBAL_NOTIFS_KEY);
            if (storedIds) {
                localSeenGlobalIds = new Set(JSON.parse(storedIds));
            }
        } catch (error) {
            console.error("Failed to parse seen notifications from localStorage on init", error);
        }

        const unreadUserNotifs = fetchedNotifications.filter(n => n.userId === user.uid && !n.isRead).length;
        const unreadGlobalNotifs = fetchedNotifications.filter(n => n.userId === 'all' && !localSeenGlobalIds.has(n.id)).length;
        
        setUnreadCount(unreadUserNotifs + unreadGlobalNotifs);

    }, (err) => {
        console.error("Error fetching notifications:", err);
        setError("Could not fetch notifications. You might need to create a Firestore index.");
    });

    return () => unsubscribe();
  }, [user, userProfile, authLoading]);


  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
        // Mark user-specific notifications as read in Firestore
        const unreadUserNotifications = notifications.filter(
            (n) => n.userId === user.uid && !n.isRead
        );
        if (unreadUserNotifications.length > 0) {
            const updatePromises = unreadUserNotifications.map((n) => 
                updateDoc(doc(db, "notifications", n.id), { isRead: true })
            );
            try {
                await Promise.all(updatePromises);
            } catch (error) {
                console.error("Error marking user notifications as read:", error);
            }
        }

        // Mark global notifications as seen in localStorage
        const currentSeenIds = new Set(seenGlobalIds);
        const newGlobalIdsToSee = notifications
            .filter(n => n.userId === "all" && !currentSeenIds.has(n.id))
            .map(n => n.id);

        if (newGlobalIdsToSee.length > 0) {
            const newSeenSet = new Set([...currentSeenIds, ...newGlobalIdsToSee]);
            setSeenGlobalIds(newSeenSet);
            try {
                localStorage.setItem(SEEN_GLOBAL_NOTIFS_KEY, JSON.stringify(Array.from(newSeenSet)));
            } catch (error) {
                console.error("Failed to save seen notifications to localStorage", error);
            }
        }
        
        // After opening, the count should be zero
        setUnreadCount(0);
    }
  };
  
    const isNotificationUnreadOnOpen = (n: Notification) => {
        if (n.userId === 'all') {
            return !seenGlobalIds.has(n.id);
        }
        return !n.isRead;
    };

    const handleDelete = async (notificationId: string) => {
        if (!user) return;
        setDeletingId(notificationId);
        const result = await deleteUserNotification(notificationId, user.uid);
        if (result.success) {
            toast({ title: "Notification deleted." });
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setDeletingId(null);
    }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-1 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] pr-4">
          <div className="py-4">
            {error ? (
              <p className="text-center text-destructive">{error}</p>
            ) : notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className={`group relative flex items-start space-x-3 rounded-lg p-3 ${isNotificationUnreadOnOpen(n) ? 'bg-primary/10' : 'bg-muted/50'}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {n.timestamp ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                     {n.userId !== 'all' && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(n.id)}
                            disabled={deletingId === n.id}
                        >
                            {deletingId === n.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                        </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No notifications yet.</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
