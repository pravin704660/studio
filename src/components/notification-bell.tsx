
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs } from "firebase/firestore";
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


export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

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

    const unsubUser = onSnapshot(userNotifsQuery, async (userSnapshot) => {
        const allSnapshot = await getDocs(allNotifsQuery);
        
        const userNotifications = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        const allNotifications = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));

        const combined = [...userNotifications, ...allNotifications];
        combined.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
        
        setNotifications(combined);
        
        // This needs a more robust way to track read status for "all" notifications
        // For now, we only count unread for user-specific ones. A local storage solution could work for "all".
        const userUnreadCount = combined.filter(n => !n.isRead && n.userId === user.uid).length;
        setUnreadCount(userUnreadCount);

    }, (error) => {
        console.error("Error fetching notifications:", error);
    });

    return () => {
      unsubUser();
    };
  }, [user]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
      const unreadUserNotifications = notifications.filter(
        (n) => n.userId === user.uid && !n.isRead
      );
      
      if (unreadUserNotifications.length === 0) return;

      const updatePromises = unreadUserNotifications.map((n) => {
        const notifRef = doc(db, "notifications", n.id);
        return updateDoc(notifRef, { isRead: true });
      });

      try {
        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      }
    }
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
                  <div key={n.id} className="flex items-start space-x-3 rounded-lg bg-muted/50 p-3">
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
