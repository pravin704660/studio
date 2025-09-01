
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
import { Ticket, Trophy, Calendar } from "lucide-react";

export default function TournamentCard({ tournament }: { tournament: Tournament }) {
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
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full text-lg font-bold" size="lg" onClick={handleJoin} disabled={isJoining}>
          {isJoining ? <Spinner /> : "Join Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
