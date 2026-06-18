import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/authStorage";

const INACTIVITY_TIME = 20 * 60 * 1000;

const useAutoLogout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let timeout;

    const resetTimer = () => {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        clearAuthSession();
        
        navigate("/login", { state: { sessionExpired: true } });
      }, INACTIVITY_TIME);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [navigate]);
};

export default useAutoLogout;
