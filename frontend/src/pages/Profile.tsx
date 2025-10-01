
import { useUserStore } from '@/store/slices/auth-slice'
import React,{useContext, useEffect, useState} from 'react'
import {IoArrowBack} from "react-icons/io5"
import { Avatar,  AvatarImage } from "@/components/ui/avatar"
import { getColor } from '@/lib/utils'
import {FaPlus,FaTrash} from "react-icons/fa"
import { colors } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {toast} from "sonner"
import { authDataContext } from '@/context/AuthContext'
import axios from "axios"
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'

function Profile() {
  const {serverUrl}=useContext(authDataContext)!
  const navigate=useNavigate()
 
  const {userInfo,setUserInfo} =useUserStore()
  const [firstName,setFirstName]=useState("")
  const [lastName,setLastName]=useState("")
  const [image,setImage]=useState<string | null>(null)
  const [selectedColor,setSelectedColor]=useState(0)
  const [hovered,setHovered]=useState(false)
  const fileInputRef=useRef<HTMLInputElement>(null)



  useEffect(()=>{
    if(userInfo?.profileSetup){
      setFirstName(userInfo?.firstName? userInfo.firstName:"")
      setLastName(userInfo?.lastName?userInfo.lastName :"")
      setSelectedColor(userInfo?.color?userInfo.color:0)
      if(userInfo?.image) setImage(userInfo?.image)
    }
  },[userInfo])


  const validateProfile=()=>{
    if(!firstName){
      toast.error("First Name is required")
      return false
    }
    if(!lastName){
      toast.error("Last Name is required")
      return false
    }
   
    return true
  }

  const saveChanges=async()=>{
   if(validateProfile()){
    try{
           const response=await axios.post(`${serverUrl}/api/auth/update-profile`,{firstName,lastName,color:selectedColor},{withCredentials:true})
           console.log("this is the response after profile setup"+ response.data)
           console.log(response.data)

           if(response.status==200){
            setUserInfo(response.data)
            console.log("profile updated successfully")
            toast.success("profile updated succesfully")
            navigate("/chat")
           }
    }catch(error){
         console.log(error)
    }
   }
  }

  const handleNavigate=()=>{
    if(userInfo?.profileSetup){
      navigate("/chat")
    }else{
      toast.error("please setup profile")
    }
  }

  const handleFileInputClick=()=>{
    if(fileInputRef.current){
    fileInputRef.current.click()
    }
  }

  const handleImageChange= async (event:React.ChangeEvent<HTMLInputElement>)=>{
    const file =event.target.files?.[0];
    if(file) setImage(URL.createObjectURL(file))
    
    if(file){
      const formData=new FormData()
      formData.append("profile-image",file)
      const response=await axios.post(`${serverUrl}/api/auth/add-profile-image`,formData,{withCredentials:true})
      if(response.status==200 && response.data.image){
           setUserInfo(response.data)
           toast.success("Image updated successfully")
      }
    }
  }

  const handleDeleteImage=async()=>{
    console.log("delete image called")
    try{
      const response=await axios.delete(`${serverUrl}/api/auth/remove-profile-image`,{withCredentials:true})
  
      if (response.status === 200 ) {
          setUserInfo(response.data)
          toast.success("Image removed successfully")
          setImage(null)
    }



  }
  catch(error){
      console.log(error)
    }
  }

  return (
    
    <div className='bg-[#1b1c24] h-[100vh] flex items-center justify-center flex-col gap-10'>
      <div className='flex flex-col gap-10 w-[80vw] md:w-max'>
        <div onClick={handleNavigate}>
          <IoArrowBack className='text-4xl lg:text-6xl text-white/90 cursor-pointer'/>
        </div>
        <div className='h-full w-32 md:h-48 relative flex items-center justify-center ' onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>

         <Avatar className='h-32 w-32 md:w-48 rounded-full overflow-hidden'>
         {image? ( <AvatarImage src={image} alt="profile" className='object-cover w-full h-full bg-black'/>):(
          <div className={` uppercase h-32 w-32 md:w-48 text-5xl border-[1px] flex items-center justify-center rounded-full ${getColor(selectedColor)}`}>
          {firstName?firstName.split("").shift():userInfo?.email.split("").shift()}
         </div>)}
        
         </Avatar>
         {
          hovered&& (
            <div className='absolute inset-0 flex items-center justify-center bg-black/50 ring-fuchsia-50 rounded-full' onClick={image?handleDeleteImage:handleFileInputClick}>
             {image? <FaTrash className='text-white text-3xl cursor-pointer '/>:<FaPlus className='text-white text-3xl cursor-pointer '/>}
            </div>
          )
         }
         <input type="file" ref={fileInputRef} className='hidden' onChange={handleImageChange} name="profile-image" accept='.png ,.jpg, .jpeg, .svg'/>
        </div>
        <div className='flex min-w-32 md:min-w-64 flex-col gap-5 text-white items-center justify-center'>
          <div className='w-full'>
            <input type="Email" placeholder='Email' disabled value={userInfo?.email} className='rounded-lg p-6 bg-[#2c2e3b] border-none'/>
          </div>
          <div className='w-full'>
            <input type="text" placeholder='FirstName'  value={firstName} onChange={(e)=>setFirstName(e.target.value)} className='rounded-lg p-6 bg-[#2c2e3b] border-none'/>
          </div>
          <div className='w-full'>
            <input type="text" placeholder='LastName'  value={lastName} onChange={(e)=>setLastName(e.target.value)} className='rounded-lg p-6 bg-[#2c2e3b] border-none'/>
          </div>
          <div className='w-full flex gap-5'>
            {
              colors.map((color,index)=>
                <div className={`${color} h-8 w-8 rounded-full cursor-pointer transition-all duration-300 ${selectedColor===index?"outline outline-white/50 outline-1":""}`} onClick={()=>setSelectedColor(index)} key={index} >

                </div>
            )
            }
          </div>
        </div>
      </div>
      <div className='w-full'>
        <Button className='h-16 w-full bg-purple-700 hover:bg-purple-900 transition-all duration-300' onClick={saveChanges}>

        </Button>

      </div>


       
     
       
    </div>
  )
}

export default Profile
