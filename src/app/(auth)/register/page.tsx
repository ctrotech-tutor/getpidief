import { redirectSignedInFromAuth } from "@/lib/auth/redirect-signed-in";
import type { Metadata } from "next";
import styles from "./register.module.css";
import { RegisterForm } from "@/components/features/auth/RegisterForm";

export const metadata: Metadata = { title: "Create Account" };

export default async function RegisterPage() {
  await redirectSignedInFromAuth();
  return <div className={styles.registration}><RegisterForm /></div>;
}
