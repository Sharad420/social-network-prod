"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import authApi from "../authApi"
import { useNavigate } from "react-router-dom"

const ResetSchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_new_password: z.string().min(8, "Passwords don't match"),
}).refine((data) => data.new_password === data.confirm_new_password, {
  path: ["confirm_new_password"],
  message: "Passwords don't match",
})

export function PasswordResetForm({ token }) {
  const form = useForm({
    resolver: zodResolver(ResetSchema),
    defaultValues: { new_password: "", confirm_new_password: "" },
  })
  const navigate = useNavigate()

  async function onSubmit(values) {
    try {
      const res = await authApi.patch("/reset_password", {
        ...values,
        token,
        type:"reset"
      })
      if (res.status === 200 && res.data.message) {
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
          name="new_password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="confirm_new_password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Reset Password</Button>
      </form>
    </Form>
  )
}