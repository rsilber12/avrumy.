import { motion } from "framer-motion";
import { ReactNode, useRef, useState } from "react";

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
}

const GlowingCard = ({ children, className = "" }: GlowingCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Glow effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.15), transparent 40%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
      />
      
      {/* Border glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(200px circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.3), transparent 40%)`,
          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "xor",
          padding: "1px",
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
      />
      
      {children}
    </motion.div>
  );
};

export default GlowingCard;
