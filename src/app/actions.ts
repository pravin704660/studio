     "use server";

import { db, adminStorage } from "@/lib/firebase/server";
import { Tournament } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";

// ✅ Create or Update Tournament
export async function createOrUpdateTournament(
  data: Partial<Tournament> & { id?: string },
  imageFile?: File
) {
  try {
    let imageUrl = data.image || "";

    // ✅ If image uploaded
    if (imageFile) {
      const bucket = adminStorage.bucket();
      const fileName = `${uuidv4()}-${imageFile.name}`;
      const file = bucket.file(`tournaments/${fileName}`);
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());

      await file.save(fileBuffer, {
        metadata: {
          contentType: imageFile.type,
        },
      });

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      imageUrl = url;
    } // <-- ✅ Missing closing bracket added

    const tournamentData: Tournament = {
      id: data.id || uuidv4(),
      title: data.title || "Untitled Tournament",
      description: data.description || "",
      date: data.date || new Date().toISOString(),
      status: data.status || "draft",
      image: imageUrl,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = doc(collection(db, "tournaments"), tournamentData.id);
    await setDoc(ref, tournamentData, { merge: true });

    return { success: true, id: tournamentData.id };
  } catch (error) {
    console.error("Error creating/updating tournament:", error);
    return { success: false, error };
  }
}

// ✅ Delete Tournament
export async function deleteTournament(id: string) {
  try {
    const ref = doc(db, "tournaments", id);
    await deleteDoc(ref);
    return { success: true };
  } catch (error) {
    console.error("Error deleting tournament:", error);
    return { success: false, error };
  }
}
