
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AppConfig } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePaymentSettings } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const DEFAULT_UPI_ID = "sankhatpravin121@oksbi";
const DEFAULT_QR_IMAGE_URL = "/done.png";

export default function PaymentSettingsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== "admin")) {
      router.push("/");
    }
  }, [user, userProfile, authLoading, router]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const configDocRef = doc(db, "config", "payment");
      const configDoc = await getDoc(configDocRef);
      if (configDoc.exists()) {
        const data = configDoc.data() as AppConfig;
        setConfig(data);
        setUpiId(data.upiId || DEFAULT_UPI_ID);
      } else {
        // Set default empty state if not configured yet
        setConfig({ upiId: DEFAULT_UPI_ID, qrImageUrl: DEFAULT_QR_IMAGE_URL });
        setUpiId(DEFAULT_UPI_ID);
      }
    } catch (error) {
      console.error("Error fetching payment config:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch payment settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "admin") {
      fetchConfig();
    }
  }, [userProfile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setQrImageFile(e.target.files[0]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('upiId', upiId);
    if (qrImageFile) {
        formData.append('qrImageFile', qrImageFile);
    }
    
    const result = await updatePaymentSettings(formData);

    if (result.success) {
      toast({
        title: "Settings Updated",
        description: "Payment settings have been saved successfully.",
      });
      fetchConfig(); // Refresh data
      setQrImageFile(null); // Clear file input state
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error,
      });
    }
    setIsSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Payment Settings</h1>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Manage Deposit Information</CardTitle>
              <CardDescription>Update the UPI ID and QR code that users will see when adding funds.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="Enter UPI ID"
                    required
                  />
                </div>

                <div className="space-y-2">
                    <Label>Current QR Code</Label>
                    <div className="flex justify-center rounded-lg bg-muted p-4">
                        <img 
                            src={config?.qrImageUrl || DEFAULT_QR_IMAGE_URL} 
                            alt="Current QR Code" 
                            width={200} 
                            height={200} 
                            className="rounded-md" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrCode">Upload New QR Code</Label>
                  <Input
                    id="qrCode"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a new image only if you want to change the current one.
                  </p>
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Spinner size="sm" className="mr-2" /> Saving...</> : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
