"use client";

import type { MouseEventHandler, ComponentType } from "react";

interface ActionButtonProps {
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  disabled?: boolean;
}

export default function ActionButton({
  label,
  onClick,
  icon: Icon,
  className = "",
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-800 whitespace-nowrap ${
        className ? className : "text-white"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={disabled}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {label}
    </button>
  );
}
