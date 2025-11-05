import { redirect } from "next/navigation";

export default function Home() {
  redirect("/lessons");
  return (
    <main className="min-h-screen flex flex-col items-center">
      {/* For Dashboard Protected private etc layouting 
      we can use this as entry point, for now we dont need it */}
    </main>
  );
}
