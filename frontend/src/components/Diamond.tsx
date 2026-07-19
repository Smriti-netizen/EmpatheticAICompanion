interface DiamondProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Diamond({ size = 8, color = "var(--color-rose)", className = "" }: DiamondProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color,
        transform: "rotate(45deg)",
      }}
    />
  );
}
