"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPSlot } from "@/components/ui/input-otp"
import authApi from "../authApi"

export function OTPForm({ email, onVerified, apiType }) {
  const [otp, setOtp] = useState("")
  const [timeLeft, setTimeLeft] = useState(180)
  const [resending, setResending] = useState(false)

  // Countdown effect
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  async function handleSubmit(e) {
    e.preventDefault()

    // strict check: must be exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {
      toast.error("OTP must be exactly 6 digits.")
      return
    }

    try {
      const res = await authApi.post("/verify_email", {
        email,
        code: otp,
        type: apiType
      })

      if (res.data.verified) {
        toast.success("Email verified!")
        onVerified(res.data.token)
      } else {
        toast.error("Invalid code")
      }
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error)
      } else {
        toast.error("Something went wrong")
      }
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await authApi.post("/send_verification", { email, type: apiType })
      toast.success("New OTP sent!")
      setTimeLeft(180)
    } catch(err) {
      toast.error(err.response?.data?.error || "Something went wrong, please try again")
    } finally {
      setResending(false)
    }
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <form onSubmit={handleSubmit} className="w-2/3 mx-auto space-y-6">
      <label className="block font-medium text-center">Enter your verification code.</label>
      <InputOTP value={otp} onChange={setOtp} maxLength={6} className="justify-center">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTP>
      <p className="text-sm text-gray-600">
        {timeLeft > 0
        // Pad seconds with max 2 0s.
        ? `Expires in ${minutes}:${seconds.toString().padStart(2, "0")}`
        : "OTP expired. Please request a new one."}
      </p>
      <div className="flex justify-center gap-4 mt-4">
        <Button type="submit" className="mt-4" disabled={otp.length < 6 || timeLeft <= 0}>Verify</Button>
        <Button
        className="mt-4"
        type="button"
        onClick={ handleResend }
        disabled={timeLeft > 0 || resending}>
          Resend OTP
        </Button>
      </div>
      
    </form>
  )
}