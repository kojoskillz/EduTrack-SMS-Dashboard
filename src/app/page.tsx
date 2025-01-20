// "use client";
// import Link from "next/link";
// import { useForm } from "react-hook-form";
// import { useState } from "react";
// import { useRouter } from "next/navigation";


// export type RegisterInputProps = {
//   fullName: string;
//   email: string;
//   password: string;
//   phone: string;
// };

// export function Homepage() {
//   const [isLoading, setIsLoading] = useState(false);
//   const {
//     register,
//     handleSubmit,
//     reset,
//     formState: { errors },
//   } = useForm<RegisterInputProps>();
//   const router = useRouter();

//   async function onSubmit(data: RegisterInputProps) {
//     console.log(data);
//   }

//   return (
//     <div className="w-full lg:grid h-screen lg:min-h-[600px] lg:grid-cols-2 relative ">
//       <div className="flex items-center justify-center py-12">
//         <div className="mx-auto grid w-[350px] gap-6">
//           <div className="absolute top-5 left-5">Simple UI</div>
//           <div className="grid gap-2 text-center">
//             <h1 className="text-3xl font-bold">Create an Account</h1>
//           </div>
//           <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
//             <TextInput
//               label="Full Name"
//               register={register}
//               name="fullName"
//               errors={errors}
//               placeholder="eg John Doe"
//             />
//             <TextInput
//               label="Email Address"
//               register={register}
//               name="email"
//               type="email"
//               errors={errors}
//               placeholder="Eg. johndoe@gmail.com"
//             />
//             <TextInput
//               label="Phone Number"
//               register={register}
//               name="phone"
//               type="tel"
//               errors={errors}
//               placeholder=""
//             />
//             <TextInput
//               label="Password"
//               register={register}
//               name="password"
//               type="password"
//               errors={errors}
//               placeholder="******"
//             />

//             <SubmitButton
//               title="Sign Up"
//               loading={isLoading}
//               loadingTitle="Creating Account please wait..."
//             />
//           </form>
//           <div className="mt-4 text-center text-sm">
//             Already have an account?{" "}
//             <Link href="/login" className="underline">
//               Login
//             </Link>
//           </div>
//         </div>
//       </div>
    
//     </div>
//   );
// }

// export default Homepage;



// App.js

"use client"

import React from "react";
import Link from "next/link";

export default function Homepage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) 
{
  return (
    <div className="h-screen flex">
    
      <div className="">
        <Link
          href="./admin "
          className=""
        >  
             <button type="submit" className="bg-blue-300 p-2 m-5 rounded-md text-white ">Admin</button>
        </Link>
      </div>
   
    </div>
  );
}


