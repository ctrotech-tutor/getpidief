import type { ComponentPropsWithoutRef } from "react";
import styles from "./PageContainer.module.css";

/** Shared outer gutters for public and onboarding pages. */
export function PageContainer({ className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`${styles.container} ${className}`} {...props} />;
}
