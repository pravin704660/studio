
"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "./ui/spinner";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pubgId, setPubgId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'New User',
            photoUrl: user.photoURL,
            walletBalance: 0,
            role: 'user',
            pubgId: pubgId,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                photoUrl: user.photoURL,
                walletBalance: 0,
                role: 'user',
                pubgId: '',
            });
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message,
        });
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        <div className="relative h-40 w-full">
            <Image 
                src="https://picsum.photos/400/200"
                alt="Player" 
                fill
                className="object-cover"
                data-ai-hint="game player"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-4xl font-black text-yellow-400">
                  PUBG 1 STAR
                </h2>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-0">
            <button onClick={() => setIsLogin(true)} className={cn("py-3 text-sm font-semibold", isLogin ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}>
                Login
            </button>
            <button onClick={() => setIsLogin(false)} className={cn("py-3 text-sm font-semibold", !isLogin ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}>
                Register
            </button>
        </div>
        <CardContent className="p-6">
          <form onSubmit={handleAuthAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {!isLogin && (
                <div className="space-y-2">
                    <Label htmlFor="pubgId">PUBG ID</Label>
                    <Input 
                        id="pubgId" 
                        type="text" 
                        placeholder="Your PUBG ID"
                        required 
                        value={pubgId}
                        onChange={(e) => setPubgId(e.target.value)}
                    />
                </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>
          <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="mx-4 text-xs uppercase text-muted-foreground">Or</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-72.2 68.7C297.6 114.5 274.3 104 248 104c-73.8 0-134.3 60.5-134.3 134.3s60.5 134.3 134.3 134.3c81.5 0 115.7-60.2 120.7-90.7H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
