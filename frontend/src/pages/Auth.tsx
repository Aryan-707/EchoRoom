import  { useContext, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import login2 from "../assets/login2.png"
import victory from "../assets/victory.svg"
import { toast } from "sonner"
import axios from "axios"
import { authDataContext } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store/slices/auth-slice'


function Auth() {
  const navigate=useNavigate()
  //   const { setUserInfo } = useAppStore(state => ({
  //   setUserInfo: state.setUserInfo,
  // }));
    const {setUserInfo,userInfo}=useUserStore()
   
    const [email,setEmail]=useState("labhgupta444@gmail.com")
    const [password,setPassword]=useState("1234567890")
    const [confirmPassword,setConfirmPassword]=useState("")
    const {serverUrl} =useContext(authDataContext)!
    // const serverUrl="http://localhost:8000"


    const validateSignUp=()=>{
      if(!email.length){
        toast.error("email is required")
        return false
      }
      if(!password.length){
        toast.error("password is required")
        return false
      }
      if(password!==confirmPassword){
        toast.error("password and confirm password should be same")
        return false
      }
      return true;
    }
    const validateLogin=()=>{
      if(!email.length){
        toast.error("email is required")
        return false
      }
      if(!password.length){
        toast.error("password is required")
        return false
      }
     
      return true;
    }

    const handleLogin=async()=>{
       if(validateLogin()){
        const response=await axios.post(`${serverUrl}/api/auth/login`,{email,password},{withCredentials:true})
        if(response.data._id){
          console.log(response.data)
          setUserInfo(response.data)
          console.log(userInfo?._id + "this is for user info")
          if(response.data.profileSetup) navigate("/chat")
           else navigate("/profile")
        }
        console.log(response.data)

       }
    }


    const handleSignUp=async()=>{

      if(validateSignUp()){
        const response= await axios.post(`${serverUrl}/api/auth/signup`,{email,password},{withCredentials:true})
        if(response.status==200){
            setUserInfo(response.data)
          navigate("/profile")
        }
        console.log(response)
      }

    }





  return (
    <div className='h-[100vh] w-[100vw] flex items-center justify-center'>
        <div className='h-[80%] bg-white border-2 border-white text-opacity-90 shadow-2xl w-[80vw] md:w-[90vw] lg:w-[70vw] xl:w-[60vw] rounded-3xl grid xl:grid-cols-2 '>
            <div className='flex flex-col gap-10 items-center justify-center'>
                <div className='flex items-center justify-center flex-col'>
                    <div className='flex items-center justify-center'>
                        <h1 className='text-5xl font-bold md:text-6xl'>Welcome</h1>
                        <img src={victory} alt="Victory emoji" className='h-[100px] ' />
                    </div>
                    <p className='font-medium text-center'> Fill in the details to get started with the best chat app!</p>
                </div>
                <div className='flex items-center justify-center w-full'>
                    <Tabs className='w-3/4' defaultValue='login'>
                               <TabsList className='bg-transparent rounded-none w-full'>
    <TabsTrigger className='data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-3 transition-all duration-300' value="login">Login</TabsTrigger>
    <TabsTrigger className='data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-3 transition-all duration-300' value="signup">Signup</TabsTrigger>
  </TabsList>
  <TabsContent value="login" className='flex flex-col gap-5 mt-10 '>
    <Input  placeholder='Email' type="email" className='rounded-full p-6' value={email} onChange={(e)=>setEmail(e.target.value)}/>
    <Input  placeholder='Password' type="password" className='rounded-full p-6' value={password} onChange={(e)=>setPassword(e.target.value)}/>
    <Button className='rounded-full p-6' onClick={handleLogin}>Login</Button>
  </TabsContent>
  <TabsContent value="signup" className='flex flex-col gap-5'>
 <Input  placeholder='Email' type="email" className='rounded-full p-6' value={email} onChange={(e)=>setEmail(e.target.value)}/>
  <Input  placeholder='Password' type="password" className='rounded-full p-6' value={password} onChange={(e)=>setPassword(e.target.value)}/>
  <Input  placeholder='confirm password' type="password" className='rounded-full p-6' value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)}/>
<Button className='rounded-full p-6' onClick={handleSignUp}>Signup</Button>
 
  </TabsContent>
</Tabs>
                </div>
            </div>
 <div className=' hidden xl:flex justify-center items-center'>
    <img src={login2} alt="Background login" className='h-[550px]' />
 </div>

        </div>
      
    </div>
  )
}

export default Auth
