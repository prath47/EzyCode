'use client';

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'



const LoginForm = () => {
  const router = useRouter()
  const { data, isPending } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isPending && data?.user) {
      router.push('/');
    }
  }, [data, isPending, router]);

  return (
    <div className='flex flex-col gap-6 justify-center items-center'>
      <div className='flex flex-col items-center justify-center space-y-4'>
        <Image src={'https://placehold.co/100x100/png'} alt='logo' width={100} height={100} unoptimized />
        <h1 className='text-6xl font-extrabold text-indigo-400'> Welcome Back!</h1>
        <p className='text-base font-medium text-zinc-400'>Login to your account for allowing device flow</p>
      </div>

      <Button disabled={isLoading} className='cursor-pointer' variant={'outline'} onClick={async () => {
        setIsLoading(true)
        try {
          await authClient.signIn.social({
            provider:'github',
            callbackURL: 'http://localhost:3000'
          })
        } catch (error) {
          setIsLoading(false)
        }
      }}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Login With Github
      </Button>
    </div>
  )
}

export default LoginForm