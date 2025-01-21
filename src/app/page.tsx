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


"use client"
import React from 'react'
import Link from "next/link";
import Image from "next/image"

const Homepage = () => {
  return (
    <div className="h-screen lg:h-screen textstyle  scroll-y-hidden  bg-blue-900">
         <div className='place-content-center m-auto grid pt-28 lg:pt-6 '>
                <Image src="/graduation-hat.png" alt="" width={50} height={20} className='m-auto place-content-center' />
                <h1 className='text-white font-semibold lg:text-5xl text-3xl  text-center '>
                  EduTrack
                </h1>
         </div>
       

       <div className='grid place-content-center '>
  
            <div>
                <Image src="/img1.png" alt="" width={450} height={500} className='lg:flex' />
            </div>
 {/* <hr className='opacity-30 w-[18rem] lg:w-[26rem] place-content-center m-auto ' /> */}
            <div className='flex m-auto '>
            {/* try-demo */}
            <div className=" ">
                        <Link
                          href="./admin "
                          className=""
                        >  
                              <button type="submit" className="bg-blue-400 text-bold hover:bg-blue-500 uppercase p-2 m-5 w-40 rounded-sm text-white ">Try Demo</button>
                        </Link>
                      </div>
              
                      {/* sign-in */}
                      {/* <div className=" ">
                        <Link
                          href="./admin "
                          className=""
                        >  
                              <button type="submit" className="bg-blue-300 p-2 m-5 rounded-md text-white ">Sign-In</button>
                        </Link>
                      </div> */}
            </div>
         
         
        </div>




     </div>
  )
}

export default Homepage
