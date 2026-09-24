import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}




// app/page.js (SERVER)
// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

// export default function HomePage() {
//   const token = cookies().get("token");

//   if (token) {
//     redirect("/dashboard");
//   }

//   redirect("/login");
// }
