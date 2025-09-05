
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function MegaResultScreen() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Mega Results</h1>
      <p className="text-muted-foreground">
        Check out the winners of our mega tournaments.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-center">Upcoming Feature</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="h-16 w-16 text-yellow-400" />
            <h3 className="mt-4 text-lg font-semibold">Mega Results Coming Soon!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                This section is under construction. Please check back later to see the results of mega tournaments.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
