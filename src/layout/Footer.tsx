import { Link } from "react-router-dom";
import { AIBadge } from "@/components/ai/AIBadge";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground text-center py-2 text-sm border-t">
      <div className="flex flex-wrap items-center justify-center gap-3 px-4">
        <span className="text-xs">
          Private by Design — Your documents stay yours.
        </span>
        <Link to="/settings#model-provider" className="underline hover:text-secondary-foreground/80 transition-colors text-xs">
          Model Provider
        </Link>
        <AIBadge variant="powered-by" />
      </div>
    </footer>
  );
};

export default Footer;
