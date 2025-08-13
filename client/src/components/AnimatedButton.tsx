import React, { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends ButtonProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  successMessage?: string;
  loadingMessage?: string;
  pulseOnHover?: boolean;
}

export default function AnimatedButton({
  children,
  isLoading = false,
  isSuccess = false,
  successMessage = "Success!",
  loadingMessage = "Processing...",
  pulseOnHover = true,
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle success animation
  if (isSuccess && !showSuccess) {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000); // Reset after 2 seconds
  }

  const buttonContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingMessage}</span>
        </div>
      );
    }

    if (showSuccess) {
      return (
        <div className="flex items-center space-x-2 animate-bounce-in">
          <Check className="w-4 h-4 animate-pulse-custom" />
          <span>{successMessage}</span>
        </div>
      );
    }

    return children;
  };

  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        "transition-all duration-200 ease-in-out",
        pulseOnHover && "hover:scale-105 active:scale-95",
        showSuccess && "bg-green-600 hover:bg-green-700 animate-success",
        isLoading && "animate-pulse-custom",
        className
      )}
    >
      {buttonContent()}
    </Button>
  );
}