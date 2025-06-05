import React from 'react'
import { cn } from "../lib/utils"
import Button from "./Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

interface LoginFormProps extends React.ComponentProps<"div"> {
  onSubmit: (email: string, password: string) => void;
  onSignUp: () => void;
  loading?: boolean;
  error?: string | null;
}

export function LoginForm({
  className,
  onSubmit,
  onSignUp,
  loading = false,
  error = null,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(email, password)
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-sm mx-auto", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m@example.com"
                  required
                  disabled={loading}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-black hover:bg-black/90 text-white"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSignUp}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-4"
              >
                Sign up
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}