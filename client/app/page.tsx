'use client';
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const {data, isPending} = authClient.useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isPending && !data?.user && !data?.session) {
      router.push('/sign-in');
    }
  }, [data, isPending, router]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Spinner />
      </div>
    )
  }

  if (!data?.user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Welcome, {data.user.name}</h1>
      {data.user.image && (
        <Image src={data.user.image} alt="profile" width={100} height={100} />
      )}
      <Button disabled={isSigningOut} variant="destructive" className="cursor-pointer" onClick={async () => {
        setIsSigningOut(true);
        try {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                router.push('/sign-in');
              }
            }
          });
        } catch (error) {
          setIsSigningOut(false);
        }
      }}>
        {isSigningOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign Out
      </Button>
    </div>
  );
}
