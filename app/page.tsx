import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-xl space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Last Mile Delivery
        </h1>
        <p className="text-lg text-slate-600">
          Logistics platform with zone-based pricing, intelligent agent
          assignment, and real-time order tracking.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Customer register</Link>
          </Button>
        </div>
        <div className="rounded-lg border bg-white p-4 text-left text-sm text-slate-600">
          <p className="font-medium text-slate-900">Demo accounts (after seed)</p>
          <ul className="mt-2 space-y-1">
            <li>Admin: admin@lmd.com / password123</li>
            <li>Customer: customer@lmd.com / password123</li>
            <li>Agent: agent@lmd.com / password123</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
