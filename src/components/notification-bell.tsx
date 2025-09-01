
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


export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      
      const unread = notifs.filter(n => !n.isRead && n.userId === user.uid).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Mark all user-specific unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.isRead && n.userId === user.uid);
      const updatePromises = unreadNotifications.map(n => {
          const notifRef = doc(db, "notifications", n.id);
          return updateDoc(notifRef, { isRead: true });
      });
      await Promise.all(updatePromises);
      setUnreadCount(0); // Optimistically update the count
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
                        {formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true })}
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
