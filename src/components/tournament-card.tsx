"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import type { Tournament, WinnerPrize } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { joinTournament } from "@/app/actions";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "./ui/spinner";
import { Ticket, Trophy, Calendar, KeyRound, UserCheck, Award, List, Users, Clock } from "lucide-react";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface TournamentCardProps {
    tournament: Tournament;
    showCredentials?: boolean;
}

const prizeIcons: { [key: string]: string } = {
    '1st': "text-yellow-400",
    '2nd': "text-gray-400",
    '3rd': "text-orange-400",
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function TournamentCard({ tournament, showCredentials = false }: TournamentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showRoomDetails, setShowRoomDetails] = useState(showCredentials);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (tournament.status === 'live' && tournament.date) {
      const startTime = tournament.date.toDate().getTime();
      const endTime = startTime + 5 * 60 * 1000;
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          setShowRoomDetails(true);
          if (timer) clearInterval(timer);
        }
      };

      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [tournament.status, tournament.date]);

  const handleJoin = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be logged in to join a tournament.",
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinTournament(tournament.id, user.uid);
      if (result.success) {
        toast({
          title: "Successfully Joined!",
          description: `You have joined the ${tournament.title} tournament.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Join Failed",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Could not join the tournament. Please try again.",
      });
    } finally {
      setIsJoining(false);
    }
  };
  
  const hasWinnerPrizes = tournament.winnerPrizes && tournament.winnerPrizes.length > 0;
  
  const getDisplayDate = () => {
    if (tournament.date) {
        const date = tournament.date.toDate();
        return date.toLocaleDateString();
    }
    return "N/A";
  };
  
  const getDisplayTime = () => {
    if (tournament.date) {
        const date = tournament.date.toDate();
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return "N/A";
  };

  return (
    <Card className="overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-primary/20">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
            <Image
              src={
                tournament.imageUrl
                  ? (tournament.imageUrl.startsWith("http")
                      ? tournament.imageUrl
                      : tournament.imageUrl)
                  : (tournament.isMega
                      ? "/MegaTournaments.jpg"
                      : "/RegularTournaments.jpg")
              }
              alt={tournament.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4">
                <CardTitle className="text-2xl font-black text-white">{tournament.title}</CardTitle>
                <p className="font-semibold text-primary-foreground/80">{tournament.gameType}</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <div className="flex flex-col items-center">
                <Ticket className="h-6 w-6 text-primary" />
                <span className="mt-1 text-sm font-semibold">Entry Fee</span>
                <span className="text-lg font-bold">₹{tournament.entryFee}</span>
            </div>
            <div className="flex flex-col items-center">
                <Trophy className="h-6 w-6 text-amber-400" />
                <span className="mt-1 text-sm font-semibold">Prize Pool</span>
                <span className="text-lg font-bold">₹{tournament.prize}</span>
            </div>
             <div className="flex flex-col items-center">
                <Users className="h-6 w-6 text-cyan-400" />
                <span className="mt-1 text-sm font-semibold">Total Slots</span>
                <span className="text-lg font-bold">
                    {tournament.joinedUsersCount || 0}/{tournament.slots}
                </span>
            </div>
            <div className="flex flex-col items-center">
                <Calendar className="h-6 w-6 text-green-400" />
                <span className="mt-1 text-sm font-semibold">Starts</span>
                <span className="text-lg font-bold">
                    {getDisplayDate()}
                    <br/>
                    <span className="flex items-center gap-1 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        {getDisplayTime()}
                    </span>
                </span>
            </div>
        </div>
        
        {hasWinnerPrizes && (
             <>
                <Separator className="my-4" />
                <div className="space-y-2 text-center">
                    <h4 className="text-sm font-semibold text-muted-foreground">Prize Distribution</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                        {tournament.winnerPrizes?.map((prize, index) => (
                           <div key={index} className="flex items-center gap-2 text-sm">
                                <Award className={`h-4 w-4 ${prizeIcons[prize.rank] || 'text-blue-400'}`} />
                                <span>{prize.rank} Prize: <span className="font-bold">₹{prize.prize}</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )}

        {(showRoomDetails || (tournament.status === 'live' && timeRemaining !== null)) && (
            <>
                <Separator className="my-4" />
                {timeRemaining > 0 ? (
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold text-yellow-500">Room credentials will be available in:</span>
                        <span className="text-2xl font-bold text-yellow-500 mt-1">{formatTime(timeRemaining)}</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="flex flex-col items-center">
                            <UserCheck className="h-6 w-6 text-blue-400" />
                            <span className="mt-1 text-sm font-semibold">Room ID</span>
                            <span className="text-lg font-bold">{tournament.roomId || "N/A"}</span>
                        </div>
                         <div className="flex flex-col items-center">
                            <KeyRound className="h-6 w-6 text-purple-400" />
                            <span className="mt-1 text-sm font-semibold">Password</span>
                            <span className="text-lg font-bold">{tournament.roomPassword || "N/A"}</span>
                        </div>
                    </div>
                )}
            </>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col sm:flex-row items-center gap-2"> {/* ✅ અહીં flex-col ઉમેર્યું છે */}
        {/* ✅ પ્રોગ્રેસ બાર અહીં ખસેડ્યો છે */}
        <div className="w-full sm:w-1/2 flex flex-col items-center sm:items-start text-sm">
             <div className="relative h-2 bg-gray-200 rounded-full w-full">
                <div 
                    className="absolute h-full rounded-full bg-cyan-400 transition-all duration-300" 
                    style={{ width: `${((tournament.joinedUsersCount || 0) / tournament.slots) * 100}%` }}
                />
            </div>
            <div className="mt-1 font-semibold text-right w-full">
                {tournament.joinedUsersCount || 0} / {tournament.slots}
            </div>
        </div>
         <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                    <List className="mr-2 h-4 w-4" />
                    View Rules
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{tournament.title} - Rules</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    {tournament.rules.length > 0 ? (
                        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                            {tournament.rules.map((rule, index) => (
                                <li key={index}>{rule}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground">No rules specified for this tournament.</p>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
        <Button className="w-full sm:w-auto text-lg font-bold" size="lg" onClick={handleJoin} disabled={isJoining || showCredentials}>
          {isJoining ? <Spinner /> : (showCredentials ? "Joined" : "Join Now")}
        </Button>
      </CardFooter>
    </Card>
  );
}
