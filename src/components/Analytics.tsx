import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { telemetry } from "../lib/telemetry";

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    const pageName = location.pathname.substring(1) || "home";
    telemetry.pageView(pageName, location.pathname + location.search);
  }, [location]);

  return null;
}
