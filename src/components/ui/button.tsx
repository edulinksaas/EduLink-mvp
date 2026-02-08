import * as React from "react"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost"
}

export function Button({
  className = "",
  variant = "default",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-bold transition-all " +
    "focus:outline-none focus:ring-2 focus:ring-purple-200 active:scale-[0.97]"

  const variants: Record<string, string> = {
    default:
      "bg-[#6344d4] text-white hover:bg-[#5235b5] disabled:opacity-50 disabled:pointer-events-none",
    ghost:
      "bg-transparent text-gray-500 hover:text-gray-700 disabled:opacity-40",
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  )
}

export default Button
