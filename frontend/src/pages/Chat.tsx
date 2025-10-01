import { useEffect } from 'react'
import {useNavigate} from "react-router-dom"
import {toast} from "sonner"
import ContactsContainer from "./chat/components/contacts-container/ContactsContainer.tsx"
import EmptyChatContainer from "./chat/components/empty-chat-container/EmptyChatContainer.tsx"
import ChatContainer from "./chat/components/chat-container/ChatContainer.tsx"
import { useChatStore, useUserStore } from '@/store/slices/auth-slice'


function Chat() {
  const {selectedChatType,isDownloading,isUploading,fileDownloadProgress,fileUploadProgress}=useChatStore()
  const {userInfo} =useUserStore()
  const navigate=useNavigate()
  useEffect(()=>{
    // console.log(userInfo +"this is the chat ")
    if(!userInfo?.profileSetup){
      toast("Please setup profile to continue")
      navigate("/profile")
    }

  },[userInfo,navigate])
  return (

    <div className='flex h-[100vh] text-white overflow-hidden'>
    {isUploading && <div className='h-[100vh] w-[100vw] fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5 backdrop-blur-lg'>
        <h5 className='text-5xl animate-pulse'>Uploading File</h5>
        {fileUploadProgress}
    </div>}
    {isDownloading && <div className='h-[100vh] w-[100vw] fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5 backdrop-blur-lg'>
        <h5 className='text-5xl animate-pulse'>Downloading File</h5>
        {fileDownloadProgress}
    </div>}
     <ContactsContainer/>
     {selectedChatType===undefined ? <EmptyChatContainer/>:<ChatContainer/>
     }
    
     

    </div>
  )
}

export default Chat
