
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
          <CardTitle>PUBG 1 Star Tournament Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">1. Eligibility</h3>
            <p>Only registered and valid users are eligible to participate in the tournament.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">2. User Information</h3>
            <p>Every user must provide their real username and profile information.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">3. Account Verification</h3>
            <p>Player registration will be verified fairly; fake accounts will be canceled and banned on first detection.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">4. Fair Play & Hacking</h3>
            <p>Hacking is strictly prohibited. Any misconduct to gain points/cash unfairly or to breach the system will lead to legal action. Suspicious activities will result in an instant ban and a police complaint. For queries, contact Pubg1startournament@gmail.com. Immediate action will be taken to ensure system security.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">5. Entry Fee & Deposit</h3>
            <p>Each room/match has a fixed entry fee (₹) that must be paid. Deposit via UPI (Admin UPI ID/QR) and upload payment screenshot. Admin will verify and credit balance. No auto-credit for unapproved payments. Minimum and maximum deposit limits will apply as per admin’s rules.</p>
          </div>
           <div className="space-y-2">
            <h3 className="font-semibold text-foreground">6. Join Conditions</h3>
            <p>Users can join a room only if wallet balance ≥ entry fee. A single user can join multiple rooms per match, as per admin’s limit (e.g., max 3 rooms). Once a room is full, it will be closed for new entries. Double-join prevention checks will be enforced via unique user IDs and technical verification.</p>
          </div>
           <div className="space-y-2">
            <h3 className="font-semibold text-foreground">7. Room Activity & Gameplay Guidelines</h3>
            <p>Before match time, all joined players will receive the room ID and password. Result Policy: Results will be considered valid only from official sources or admin-uploaded screenshots/videos. Cheating or unethical gameplay during matches will lead to disqualification and prize cancellation.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
