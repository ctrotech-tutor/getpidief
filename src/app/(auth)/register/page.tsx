import type { Metadata } from "next";
import styles from "./register.module.css";
import { RegisterForm } from "@/components/features/auth/RegisterForm";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return <div className={styles.registration}><RegisterForm /></div>;
}
