
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type Screen = "home" | "wallet" | "mega-result" | "tournaments" | "profile" | "rules";

interface RulesScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

export default function RulesScreen({ setActiveScreen }: RulesScreenProps) {
  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveScreen("profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Rules & Regulations</h1>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tournament Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">1. Eligibility</h3>
            <p>All players must have a valid game ID. Players found using multiple accounts will be disqualified.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">2. Fair Play</h3>
            <p>Cheating, hacking, or using any third-party software that gives an unfair advantage is strictly prohibited. Offenders will be permanently banned from all future tournaments.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">3. Match Conduct</h3>
            <p>Players must join the custom room within the specified time. Late entries will not be entertained. All players are expected to maintain sportsmanship. Toxicity and abusive language will lead to penalties.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">4. Prize Distribution</h3>
            <p>Prizes will be credited to the winner's in-app wallet within 24 hours of the tournament's conclusion. Ensure your wallet details are correct.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">5. Admin's Decision</h3>
            <p>The tournament admin's decision is final in all matters. Any disputes must be raised through the official support channel within one hour of the match ending.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
