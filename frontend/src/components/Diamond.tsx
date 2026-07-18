interface DiamondProps {
  /** Side length in pixels. */
  size?: number;
  /** Fill color, defaults to the rose accent. */
  color?: string;
  className?: string;
}

/**
 * The rose diamond bullet from Poster 1, the single recurring icon motif
 * used across the whole product (dividers, eyebrows, selected states).
 */
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
