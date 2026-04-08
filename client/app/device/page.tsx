"use client";

import { authClient } from "@/lib/auth-client";
import type React from "react";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";

const DeviceAuthorizationPage = () => {
  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formattedCode = userCode.trim().replace(/-/g, "").toUpperCase();

      const response = await authClient.device({
        query: { user_code: formattedCode },
      });

      if (response.data) {
        router.push(`/approve?user_code=${formattedCode}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setError("Invalid or Expired Code");
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setUserCode(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        {/* Header Section */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Authorize Device
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the authorization code displayed on your other device to continue.
          </p>
        </div>

        {/* Form Section */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="user-code" className="sr-only">
              Device Code
            </label>
            <input
              id="user-code"
              name="code"
              type="text"
              required
              value={userCode}
              onChange={handleChange}
              disabled={isLoading}
              className="appearance-none rounded-lg relative block w-full px-4 py-4 border border-gray-300 placeholder-gray-400 text-gray-900 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
              placeholder="XXXX-XXXX"
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-center text-red-600 font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !userCode.trim()}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                Verifying...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeviceAuthorizationPage;