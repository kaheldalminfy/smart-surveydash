import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";

const DashboardButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  if (location.pathname === "/dashboard") return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
          <LayoutDashboard className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('dashboardBtn.tooltip')}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default DashboardButton;
