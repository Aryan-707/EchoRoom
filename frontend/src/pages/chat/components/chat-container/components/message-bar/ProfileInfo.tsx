import { useContext } from 'react'
import { Avatar,  AvatarImage } from "@/components/ui/avatar"
import { useUserStore } from '@/store/slices/auth-slice'
import { getColor } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip"
import { FiEdit2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { IoPowerSharp} from "react-icons/io5"
import axios from 'axios'
import { authDataContext } from '@/context/AuthContext.tsx'





function ProfileInfo() {
  const navigate=useNavigate()
  const {userInfo,setUserInfo}=useUserStore()
  const{ serverUrl}=useContext(authDataContext)!
  const logOut=async ()=>{
    console.log("logout called")
     try{
      
      const response=await axios.post(`${serverUrl}/api/auth/logout`,{},{withCredentials:true})
      console.log("fasdf")
      if(response.status==200){
 
        setUserInfo(undefined)
        navigate("/auth")
         
       
        
      }
     }catch(error){
      console.log(error)
     }
}


  return (
    <div className='absolute bottom-0 h-16 flex items-center justify-between px-10 w-full bg-[#2a3b33]'>
      <div className='flex gap-3 items-center justify-center'>
        <div className='w-12 h-12 relative'>
           <Avatar className='h-12 w-12  rounded-full overflow-hidden'>
         {userInfo?.image? ( <AvatarImage src={userInfo.image} alt="profile" className='object-cover w-full h-full bg-black'/>):(
          <div className={` uppercase h-12 w-12 md:w-48 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(userInfo?.color?userInfo.color:0)}`}>
          {userInfo?.firstName?userInfo.firstName.split("").shift():userInfo?.email.split("").shift()}
         </div>)}
        
         </Avatar>
        </div>
        <div>
          {
            userInfo?.firstName&& userInfo?.lastName?`${userInfo?.firstName} ${userInfo.lastName}     `:""
          }
        </div>



      </div>

      <div className="flex gap-5 ">
       
      <TooltipProvider>
        <Tooltip>
  <TooltipTrigger><FiEdit2 className="text-purple-500 text-xl font-medium "onClick={()=>{navigate("/profile")}} /></TooltipTrigger>
  <TooltipContent className='bg-[#1c1b1e] border-none text-white' >
    <p>Edit Profile</p>
  </TooltipContent>
</Tooltip>
</TooltipProvider>

      <TooltipProvider>
        <Tooltip>
  <TooltipTrigger><IoPowerSharp className="text-red-500 text-xl font-medium "onClick={logOut} /></TooltipTrigger>
  <TooltipContent className='bg-[#1c1b1e] border-none text-white' >
    <p>Log Out</p>
  </TooltipContent>
</Tooltip>
</TooltipProvider>


      </div>
      
    </div>
  )
}

export default ProfileInfo
