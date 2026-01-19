import { useEffect, useState } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}

const AnimatedText = ({ 
  text, 
  className = "", 
  delay = 0,
  speed = 55
}: AnimatedTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    let typeInterval: ReturnType<typeof setInterval>;
    let cursorTimeout: ReturnType<typeof setTimeout>;

    const startDelay = setTimeout(() => {
      setShowCursor(true);
      
      typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          currentIndex++;
          setDisplayedText(text.slice(0, currentIndex));
        } else {
          clearInterval(typeInterval);
          cursorTimeout = setTimeout(() => {
            setShowCursor(false);
          }, 400);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(cursorTimeout);
      if (typeInterval) clearInterval(typeInterval);
    };
  }, [text, delay, speed]);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && (
        <span 
          className="inline-block w-[2px] h-[0.85em] bg-foreground/70 ml-[2px] align-middle animate-pulse"
        />
      )}
    </span>
  );
};

export default AnimatedText;
