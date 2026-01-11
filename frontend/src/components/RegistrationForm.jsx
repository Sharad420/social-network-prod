"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom";
import authApi from "../authApi"

const FormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords don't match",
})

export function RegistrationForm({ token }) {
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  })

  // Username debounce and availability check logic
  const [username, setUsername] = useState("");
  const [isAvailable, setIsAvailable] = useState(null);
  const [checking, setChecking] = useState(false);

  const navigate = useNavigate(); // Functional programming paradigm

  // Use effect on username hook change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (username.trim() === "") {
        setIsAvailable(null);
        setChecking(false);
        return;
      }
      setChecking(true);
      const checkAvailability = async () => {
        setChecking(true);
        try {
          const res = await authApi.get(`/check_username`, {
            params: { username },
          });
          setIsAvailable(res.data.available);
        } catch (err) {
          console.error("Error checking username:", err);
          setIsAvailable(false);
        } finally {
          setChecking(false);
        }
      };
      checkAvailability();
    }, 900);
    return () => clearTimeout(delayDebounce);
  }, [username]);


  async function onSubmit(values) {
    if (isAvailable === false) {
      form.setError("username", {message: "Username already taken"});
      return;
    }

    if (checking) {
      form.setError("root", {
        type: "manual",
        message: "Hold on, we’re still checking username availability...",
      });
      return;
    }

    try {
      const res = await authApi.post("/register", {
          // Spread operator of the form values and the token.
          ...values,
          token,
        });

      if (res.status === 201 && res.data.message) {
        toast.success(res.data.message)
        navigate("/login")
      }
    } catch (err) {
      if (err.response?.data?.field) {
        form.setError(err.response.data.field, {
          message: err.response.data.error, 
        })
      } else if (err.response?.data?.error) {
        toast.error(err.response.data.error)
      } else {
        toast.error("Something went wrong")
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          name="username"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={e => {
                    field.onChange(e);
                    setUsername(e.target.value);
                  }}
                />
              </FormControl>
              {/* Username availability feedback */}
              {username && (
                <div className="text-xs mt-1">
                  {checking ? (
                    <span>Checking availability…</span>
                  ) : isAvailable === true ? (
                    <span className="text-green-600">Username available ✅</span>
                  ) : isAvailable === false ? (
                    <span className="text-red-600">Username taken ❌</span>
                  ) : null}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField name="password" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl><Input type="password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="confirmPassword" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm Password</FormLabel>
            <FormControl><Input type="password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled = { !isAvailable }>Create Account</Button>
      </form>
    </Form>
  )
}