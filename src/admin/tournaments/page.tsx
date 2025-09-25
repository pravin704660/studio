"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import {
  createOrUpdateTournament,
  deleteTournament,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MinusCircle,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tournament, WinnerPrize } from "@/lib/types";

interface FormData {
  title: string;
  gameType: string;
  date: string;
  time: string;
  entryFee: number;
  slots: number;
  prize: number;
  rules: string;
  status: string;
  isMega: boolean;
  roomId: string;
  roomPassword: string;
  imageUrl: string;
  winnerPrizes: WinnerPrize[];
}

const initialFormData: FormData = {
  title: "",
  gameType: "Solo",
  date: "",
  time: "",
  entryFee: 0,
  slots: 100,
  prize: 0,
  rules: "",
  status: "draft",
  isMega: false,
  roomId: "",
  roomPassword: "",
  imageUrl: "",
  winnerPrizes: [
    { rank: "1st", prize: 0 },
    { rank: "2nd", prize: 0 },
    { rank: "3rd", prize: 0 },
    { rank: "4th", prize: 0 },
  ],
};

export default function ManageTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(
    null
  );
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handlePrizeChange = (index: number, field: keyof WinnerPrize, value: string) => {
    const newPrizes = [...formData.winnerPrizes];
    newPrizes[index][field] = field === "prize" ? parseInt(value) || 0 : value;
    setFormData((prev) => ({
      ...prev,
      winnerPrizes: newPrizes,
    }));
  };

  const addPrizeField = () => {
    const ranks = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
    if (formData.winnerPrizes.length < ranks.length) {
      setFormData((prev) => ({
        ...prev,
        winnerPrizes: [
          ...prev.winnerPrizes,
          { rank: ranks[prev.winnerPrizes.length], prize: 0 },
        ],
      }));
    }
  };

  const removePrizeField = (index: number) => {
    setFormData((prev) => {
      const newPrizes = prev.winnerPrizes.filter((_, i) => i !== index);
      return { ...prev, winnerPrizes: newPrizes };
    });
  };

  const handleOpenEditDialog = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id);

    // ✅ ખાતરી કરો કે તારીખ અને સમય યોગ્ય રીતે ફોર્મેટ થયેલ છે
    let date = null;
    let timeString = "";
    if (tournament.date instanceof Timestamp) {
      date = tournament.date.toDate();
      timeString = date.toTimeString().slice(0, 5);
    } else if (tournament.date) {
      date = new Date(tournament.date);
      if (!isNaN(date.getTime())) {
        timeString = date.toTimeString().slice(0, 5);
      }
    }
    
    const dateString = date ? date.toISOString().slice(0, 10) : "";

    setFormData({
      // ✅ દરેક ફીલ્ડ માટે ખાલી સ્ટ્રિંગ અથવા 0 ને ડિફોલ્ટ વેલ્યુ તરીકે સેટ કરો
      title: tournament.title || "",
      gameType: tournament.gameType || "Solo",
      date: dateString,
      time: timeString,
      entryFee: tournament.entryFee || 0,
      slots: tournament.slots || 100,
      prize: tournament.prize || 0,
      rules: Array.isArray(tournament.rules) ? tournament.rules.join("\n") : "",
      status: tournament.status || "draft",
      isMega: tournament.isMega || false,
      roomId: tournament.roomId || "",
      roomPassword: tournament.roomPassword || "",
      imageUrl: tournament.imageUrl || "",
      winnerPrizes: Array.isArray(tournament.winnerPrizes) && tournament.winnerPrizes.length > 0
          ? tournament.winnerPrizes
          : [
              { rank: "1st", prize: 0 },
              { rank: "2nd", prize: 0 },
              { rank: "3rd", prize: 0 },
              { rank: "4th", prize: 0 },
            ],
    });

    setIsDialogOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.time || !formData.entryFee || !formData.slots) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
        const rulesArray = typeof formData.rules === 'string' 
          ? formData.rules.split("\n").map(rule => rule.trim()).filter(rule => rule.length > 0)
          : formData.rules;
        
        const tournamentDataForAction = {
          ...formData,
          rules: rulesArray,
          isMega: formData.isMega,
          type: formData.isMega ? "mega" : "regular",
          winnerPrizes: formData.winnerPrizes?.filter(
            (p) => p.rank && p.prize > 0
          ),
        };

        const result = editingTournamentId
          ? await createOrUpdateTournament({
              ...tournamentDataForAction,
              id: editingTournamentId,
            })
          : await createOrUpdateTournament(tournamentDataForAction);
        
        if (result && result.success) {
          toast({ title: "Success", description: "Tournament saved successfully." });
          setIsDialogOpen(false);
        } else {
          throw new Error(result?.error || "Failed to save tournament.");
        }
    } catch (error: any) {
        console.error("Error saving tournament:", error);
        toast({
            variant: "destructive",
            title: "Error creating tournament",
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
};

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this tournament?")) {
      try {
        await deleteDoc(doc(firestore, "tournaments", id));
        toast({ title: "Success", description: "Tournament deleted successfully." });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not delete tournament.",
        });
      }
    }
  };

  useEffect(() => {
    const q = query(collection(firestore, "tournaments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournamentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Tournament[];
      setTournaments(tournamentsData);
    });

    return () => unsubscribe();
  }, []);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTournamentId(null);
    setFormData(initialFormData);
  };

  return (
    <main className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Tournaments</CardTitle>
            <CardDescription>
              Create, edit, and delete tournaments.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCloseDialog}>
                {editingTournamentId ? "Edit Tournament" : "New Tournament"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingTournamentId ? "Edit Tournament" : "New Tournament"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <Input
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
                <Select
                  name="gameType"
                  value={formData.gameType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gameType: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Game Type" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Duo">Duo</SelectItem>
                      <SelectItem value="Squad">Squad</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="Time"
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Entry Fee"
                    type="number"
                    name="entryFee"
                    value={formData.entryFee}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="Slots"
                    type="number"
                    name="slots"
                    value={formData.slots}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Input
                  label="Prize Pool"
                  type="number"
                  name="prize"
                  value={formData.prize}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Room ID"
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleInputChange}
                />
                <Input
                  label="Room Password"
                  name="roomPassword"
                  value={formData.roomPassword}
                  onChange={handleInputChange}
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isMega"
                    checked={formData.isMega}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isMega: checked }))}
                  />
                  <Label htmlFor="isMega">Mega Tournament</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label>Status</Label>
                  <Select
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Winner Prizes</Label>
                  {formData.winnerPrizes.map((prize, index) => (
                    <div key={index} className="flex items-center gap-2 mt-2">
                      <Input
                        name={`rank-${index}`}
                        value={prize.rank}
                        onChange={(e) => handlePrizeChange(index, "rank", e.target.value)}
                        placeholder="Rank (e.g., 1st)"
                      />
                      <Input
                        name={`prize-${index}`}
                        type="number"
                        value={prize.prize}
                        onChange={(e) => handlePrizeChange(index, "prize", e.target.value)}
                        placeholder="Prize Amount"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePrizeField(index)}
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={addPrizeField}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Prize
                  </Button>
                </div>
                <Input
                  label="Image URL"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="Paste image URL here"
                />
                <Textarea
                  label="Rules (one per line)"
                  name="rules"
                  value={formData.rules}
                  onChange={handleInputChange}
                  rows={5}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner /> : editingTournamentId ? "Update Tournament" : "Create Tournament"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entry Fee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((tournament) => (
                <TableRow key={tournament.id}>
                  <TableCell className="font-medium">{tournament.title}</TableCell>
                  <TableCell>{tournament.isMega ? "Mega" : "Regular"}</TableCell>
                  <TableCell>
                    {tournament.date instanceof Timestamp
                      ? tournament.date.toDate().toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tournament.status === "live" ? "success" : "default"}>
                      {tournament.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{tournament.entryFee}</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditDialog(tournament)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tournament.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
