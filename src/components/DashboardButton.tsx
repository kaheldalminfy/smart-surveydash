import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DashboardButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on dashboard page itself
  if (location.pathname === "/dashboard") {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="shrink-0"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>لوحة التحكم</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default DashboardButton;
