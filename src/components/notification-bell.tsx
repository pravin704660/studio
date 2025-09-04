
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Bell, Mail } from "lucide-react";
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

const SEEN_GLOBAL_NOTIFS_KEY = "seenGlobalNotifIds";

export default function NotificationBell() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [seenGlobalIds, setSeenGlobalIds] = useState<Set<string>>(new Set());

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

    const userNotifsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const allNotifsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", "all"),
      orderBy("timestamp", "desc")
    );
    
    let userNotifications: Notification[] = [];
    let allNotifications: Notification[] = [];
    let localSeenGlobalIds = new Set<string>();
    try {
        const storedIds = localStorage.getItem(SEEN_GLOBAL_NOTIFS_KEY);
        if (storedIds) {
            localSeenGlobalIds = new Set(JSON.parse(storedIds));
        }
    } catch (error) {
        console.error("Failed to parse seen notifications from localStorage on init", error);
    }

    const mergeAndSetNotifications = () => {
        const combined = [...userNotifications, ...allNotifications].sort(
            (a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)
        );
        setNotifications(combined);
        
        const unreadUserNotifs = userNotifications.filter(n => !n.isRead).length;
        const unreadGlobalNotifs = allNotifications.filter(n => !localSeenGlobalIds.has(n.id)).length;
        
        setUnreadCount(unreadUserNotifs + unreadGlobalNotifs);
    }
    
    const unsubUser = onSnapshot(userNotifsQuery, (snapshot) => {
        userNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        mergeAndSetNotifications();
    }, (error) => console.error("Error fetching user notifications:", error));

    const unsubAll = onSnapshot(allNotifsQuery, (snapshot) => {
        allNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        mergeAndSetNotifications();
    }, (error) => console.error("Error fetching global notifications:", error));

    return () => {
      unsubUser();
      unsubAll();
    };
  }, [user, userProfile, authLoading]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
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
    }
  };

  const isNotificationUnread = (n: Notification) => {
    if (n.userId === 'all') {
      return !seenGlobalIds.has(n.id);
    }
    return !n.isRead;
  };

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
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className={`flex items-start space-x-3 rounded-lg p-3 ${isNotificationUnread(n) ? 'bg-primary/10' : 'bg-muted/50'}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {n.timestamp ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
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
