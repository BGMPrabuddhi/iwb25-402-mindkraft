"use client";

import React, { useState } from "react";
import colors from "@/styles/colors";

interface ButtonProps {
  variant?: "primary" | "secondary" | "text";
  size?: "small" | "medium" | "large";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "medium",
  children,
  onClick,
  disabled = false,
  className = "",
  style,
  type = "button",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleMouseEnter = () => !disabled && setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsActive(false);
  };
  const handleMouseDown = () => !disabled && setIsActive(true);
  const handleMouseUp = () => setIsActive(false);

  const baseStyles: React.CSSProperties = {
    borderRadius: 4,
    fontFamily: "var(--font-family-text)",
    fontWeight: "var(--font-weight-medium)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 16px",
    gap: 8,
    opacity: disabled ? 0.5 : 1,
    minWidth: 0,
  };

  const sizeStyles: Record<
    NonNullable<ButtonProps["size"]>,
    React.CSSProperties
  > = {
    small: {
      padding: "8px 16px",
      fontSize: "var(--font-size-xsm)",
    },
    medium: {
      padding: "12px 20px",
      fontSize: "var(--font-size-sm)",
    },
    large: {
      padding: "16px 24px",
      fontSize: "var(--font-size-md)",
    },
  };

  const variantStyles: Record<
    NonNullable<ButtonProps["variant"]>,
    Record<
      "default" | "hover" | "active",
      React.CSSProperties
    >
  > = {
    primary: {
      default: {
        backgroundColor: colors.primary.DEFAULT,
        color: colors.neutral.light,
        border: "none",
      },
      hover: {
        backgroundColor: colors.primary.light,
        color: colors.neutral.light,
        border: "none",
      },
      active: {
        backgroundColor: colors.primary.dark,
        color: colors.neutral.light,
        border: "none",
      },
    },
    secondary: {
      default: {
        backgroundColor: colors.neutral.light,
        color: colors.primary.DEFAULT,
        border: `2px solid ${colors.primary.DEFAULT}`,
      },
      hover: {
        backgroundColor: colors.neutral.light,
        color: colors.primary.light,
        border: `2px solid ${colors.primary.light}`,
      },
      active: {
        backgroundColor: colors.neutral.light,
        color: colors.primary.dark,
        border: `2px solid ${colors.primary.dark}`,
      },
    },
    text: {
      default: {
        backgroundColor: "transparent",
        color: colors.primary.DEFAULT,
        border: "none",
      },
      hover: {
        backgroundColor: "transparent",
        color: colors.primary.light,
        border: "none",
      },
      active: {
        backgroundColor: "transparent",
        color: colors.primary.dark,
        border: "none",
      },
    },
  };

  const currentState = isActive
    ? "active"
    : isHovered
    ? "hover"
    : "default";

  const styles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...(variantStyles[variant]?.[currentState] ?? variantStyles.primary.default),
    ...style,
  };

  return (
    <button
      type={type}
      style={styles}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled}
      className={className}
      suppressHydrationWarning={true}
    >
      {children}
    </button>
  );
};

export default Button;
