"use client";

import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MonitorSmartphone, ShieldCheck, XCircle } from "lucide-react";

const DeviceApprovalPage = () => {
  const { data, isPending, error } = authClient.useSession();

  const router = useRouter();
  const searchParams = useSearchParams();

  const userCode = searchParams.get("user_code");

  const [isProcessing, setIsProcessing] = useState({
    approve: false,
    deny: false,
  });

  // Handle unauthenticated state safely without triggering render warnings
  useEffect(() => {
    if (!isPending && !data?.session && !data?.user) {
      router.push("/sign-in");
    }
  }, [data, isPending, router]);

  const handleApprove = async () => {
    setIsProcessing({
      approve: true,
      deny: false,
    });

    try {
      toast.loading("Approving Device...", { id: "loading" });
      await authClient.device.approve({
        userCode: userCode!,
      });

      toast.dismiss("loading");
      toast.success("Device Approved Successfully");
      router.push("/");
    } catch (error) {
      toast.dismiss("loading");
      toast.error("Failed To Approve");
      console.log("Error", error);
    } finally {
      setIsProcessing({
        approve: false,
        deny: false,
      });
    }
  };

  const handleDeny = async () => {
    setIsProcessing({
      approve: false,
      deny: true,
    });

    try {
      toast.loading("Denying Device...", { id: "loading" });
      await authClient.device.deny({
        userCode: userCode!,
      });

      toast.dismiss("loading");
      toast.success("Device Denied Successfully");
      router.push("/");
    } catch (error) {
      toast.dismiss("loading");
      toast.error("Failed To Deny");
      console.log("Error", error);
    } finally {
      setIsProcessing({
        approve: false,
        deny: false,
      });
    }
  };

  if (isPending || (!data?.session && !data?.user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Spinner />
      </div>
    );
  }

  // Edge case if somehow the page is reached without a code
  if (!userCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h2>
          <p className="text-gray-600 mb-6">No device code was provided in the URL.</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 px-4 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <MonitorSmartphone className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Approve Device
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            A new device is requesting access to your account. Please verify the code below matches the one shown on your device.
          </p>
        </div>

        {/* Code Display */}
        <div className="mt-6 mb-8 bg-gray-50 py-4 px-6 rounded-lg border border-gray-200 text-center">
          <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Authorization Code
          </span>
          <span className="block text-3xl font-mono tracking-widest text-gray-900 font-bold">
            {userCode}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDeny}
            disabled={isProcessing.approve || isProcessing.deny}
            className="flex-1 inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing.deny ? <Spinner className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            Deny Access
          </button>
          
          <button
            type="button"
            onClick={handleApprove}
            disabled={isProcessing.approve || isProcessing.deny}
            className="flex-1 inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing.approve ? <Spinner className="w-4 h-4 mr-2 text-white" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Approve Device
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceApprovalPage;