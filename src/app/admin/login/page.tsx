import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand">
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          <div>
            <b>JF MOTORES</b>
            <span>Panel de administración</span>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
