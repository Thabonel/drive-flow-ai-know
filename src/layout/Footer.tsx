import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground text-center py-1 text-sm">
      <span className="mr-2">
        Private by Design — Your documents stay yours. Choose where your AI runs.
      </span>
      <Link to="/settings#model-provider" className="underline hover:text-secondary-foreground/80 transition-colors">
        Model Provider
      </Link>
    </footer>
  );
};

export default Footer;
