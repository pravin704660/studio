                            <span className="mt-1 text-sm font-semibold">Password</span>
                            <span className="text-lg font-bold">{tournament.roomPassword || "N/A"}</span>
                        </div>
                    </div>
                )}
            </>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center gap-2"> {/* ✅ અહીં flex-col હટાવી દીધું */}
         <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
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
        <Button className="w-full text-lg font-bold" size="lg" onClick={handleJoin} disabled={isJoining || showCredentials}>
          {isJoining ? <Spinner /> : (showCredentials ? "Joined" : "Join Now")}
        </Button>
      </CardFooter>
    </Card>
  );
}
