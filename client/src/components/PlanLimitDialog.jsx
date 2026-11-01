import { useEffect, useState } from "react";
import { ArrowRight, Crown, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserContext } from "../context/userContext";
import Modal from "./Modal";

export default function PlanLimitDialog() {
  const { user } = useUserContext();
  const [limitMessage, setLimitMessage] = useState("");

  useEffect(() => {
    const showLimit = (event) => {
      if (typeof event.detail?.message === "string") setLimitMessage(event.detail.message);
    };

    window.addEventListener("noted:plan-limit", showLimit);
    return () => window.removeEventListener("noted:plan-limit", showLimit);
  }, []);

  if (!limitMessage) return null;

  const isSchoolAdmin = user?.role === "school_admin";
  const isSchoolLinked = Boolean(user?.schoolOwnerId || user?.schoolId);
  const canPurchase = isSchoolAdmin
    || ((user?.role === "personal_user" || user?.role === "teacher") && !isSchoolLinked);
  const pricingAudience = isSchoolAdmin ? "schools" : "teachers";
  const dismiss = () => setLimitMessage("");

  return (
    <Modal
      title={isSchoolLinked && !isSchoolAdmin ? "Your school plan limit was reached" : "You've reached a plan limit"}
      icon={<ShieldAlert className="h-5 w-5 shrink-0 text-brand" />}
      onClose={dismiss}
    >
      <p className="text-sm leading-6 text-muted-foreground">{limitMessage}</p>
      {isSchoolLinked && !isSchoolAdmin ? (
        <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          Your account is covered by your school. Ask your school administrator about plan options.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Choose a plan with limits that better fit how you use Noted.
        </p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Not now
        </button>
        {canPurchase && (
          <Link
            to={`/pricing?audience=${pricingAudience}`}
            onClick={dismiss}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Crown className="h-4 w-4" />
            {isSchoolAdmin ? "View school plans" : "Explore Pro plans"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </Modal>
  );
}
