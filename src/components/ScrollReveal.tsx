import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  scale?: boolean;
  blur?: boolean;
}

const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 1,
  scale = false,
  blur = false,
}: ScrollRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  const directionMap = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  };

  const initialOffset = directionMap[direction];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...initialOffset,
        scale: scale ? 0.98 : 1,
        filter: blur ? "blur(4px)" : "blur(0px)",
      }}
      animate={
        isInView
          ? {
              opacity: 1,
              y: 0,
              x: 0,
              scale: 1,
              filter: "blur(0px)",
            }
          : {}
      }
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
