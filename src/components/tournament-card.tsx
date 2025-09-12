
"use client";

import Image from "next/image";
import type { Tournament } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { joinTournament } from "@/app/actions";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Spinner } from "./ui/spinner";
import { Ticket, Trophy, Calendar, KeyRound, UserCheck, Award } from "lucide-react";
import { Separator } from "./ui/separator";

interface TournamentCardProps {
    tournament: Tournament;
    showCredentials?: boolean;
}

export default function TournamentCard({ tournament, showCredentials = false }: TournamentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

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
  
  const hasWinnerPrizes = tournament.winnerPrizes && Object.values(tournament.winnerPrizes).some(p => p && p > 0);

  return (
    <Card className="overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-primary/20">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
            <Image
                src={tournament.imageUrl || "https://picsum.photos/600/400"}
                alt={tournament.title}
                fill
                className="object-cover"
                data-ai-hint="game tournament"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4">
                <CardTitle className="text-2xl font-black text-white">{tournament.title}</CardTitle>
                <p className="font-semibold text-primary-foreground/80">{tournament.gameType}</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
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
                <Calendar className="h-6 w-6 text-green-400" />
                <span className="mt-1 text-sm font-semibold">Starts</span>
                <span className="text-lg font-bold">{tournament.date.toDate().toLocaleDateString()}</span>
            </div>
        </div>
        
        {hasWinnerPrizes && (
             <>
                <Separator className="my-4" />
                <div className="space-y-2 text-center">
                    <h4 className="text-sm font-semibold text-muted-foreground">Prize Distribution</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                        {tournament.winnerPrizes?.first && tournament.winnerPrizes.first > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Award className="h-4 w-4 text-yellow-400" />
                                <span>1st Prize: <span className="font-bold">₹{tournament.winnerPrizes.first}</span></span>
                            </div>
                        )}
                         {tournament.winnerPrizes?.second && tournament.winnerPrizes.second > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Award className="h-4 w-4 text-gray-400" />
                                <span>2nd Prize: <span className="font-bold">₹{tournament.winnerPrizes.second}</span></span>
                            </div>
                        )}
                         {tournament.winnerPrizes?.third && tournament.winnerPrizes.third > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Award className="h-4 w-4 text-orange-400" />
                                <span>3rd Prize: <span className="font-bold">₹{tournament.winnerPrizes.third}</span></span>
                            </div>
                        )}
                         {tournament.winnerPrizes?.fourth && tournament.winnerPrizes.fourth > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <Award className="h-4 w-4 text-blue-400" />
                                <span>4th Prize: <span className="font-bold">₹{tournament.winnerPrizes.fourth}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}

        {showCredentials && (tournament.roomId || tournament.roomPassword) && (
            <>
                <Separator className="my-4" />
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
            </>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full text-lg font-bold" size="lg" onClick={handleJoin} disabled={isJoining || showCredentials}>
          {isJoining ? <Spinner /> : (showCredentials ? "Joined" : "Join Now")}
        </Button>
      </CardFooter>
    </Card>
  );
}
