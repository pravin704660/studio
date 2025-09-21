export default function HomeScreen() {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex justify-center">
        <Image
          src="/home/Homepageimage.jpg"
          alt="Homepage Banner"
          width={1600}
          height={900}
          className="w-full max-w-4xl h-auto object-contain rounded-lg"
        />
      </div>

      {/* Tournament Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border bg-card p-4"
              >
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ))
          : tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
      </div>
    </div>
  );
}
