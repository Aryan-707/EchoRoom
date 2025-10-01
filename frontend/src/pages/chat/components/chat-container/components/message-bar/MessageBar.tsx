import {useContext, useEffect, useState} from 'react'
import {GrAttachment} from "react-icons/gr"
import { IoSend } from 'react-icons/io5'
import { RiEmojiStickerLine } from 'react-icons/ri'
import { useRef } from 'react'
import EmojiPicker, { Theme }  from "emoji-picker-react"
import type { EmojiClickData } from 'emoji-picker-react'
import { useChatStore, useUserStore } from '@/store/slices/auth-slice'
import { useSocket } from '@/context/SocketContext'
import axios from 'axios'
import { authDataContext } from '@/context/AuthContext'

function MessageBar() {
    const [message,setMessage]=useState("")
    const emojiRef=useRef<HTMLDivElement>(null)
    const [emojiPickerOpen,setEmojiPickerOpen]=useState(false)
    const {selectedChatType,selectedChatData,setIsUploading,setFileUploadProgress}=useChatStore()
    const socket=useSocket()
    const {userInfo}=useUserStore()
    const fileInputRef=useRef<HTMLInputElement>(null)
    const {serverUrl}=useContext(authDataContext)!

    const handleAttachmentChange=async(event:any)=>{
      try{
        const file=event.target.files[0]
        console.log(file)

        if(file){
          const formData=new FormData()
          formData.append("file",file)
          setIsUploading(true)
          
          const response=await axios.post(`${serverUrl}/api/messages/upload-file`,formData,{withCredentials:true,onUploadProgress:data=>{setFileUploadProgress(Math.round((100*data.loaded)/(data.total?data.total:100)))}})
          console.log(response)
          console.log(response.data)
          if(response.status==200 && response.data){
            setIsUploading(false)
            if(selectedChatType==="contact"){
 
            socket?.socket?.emit("sendMessage",{
              sender:userInfo?._id,
              content:undefined,
              recipient:selectedChatData._id,
              messageType:"file",
              fileUrl:response.data
            })
          } else if(selectedChatType==="channel"){
                         
            socket.socket?.emit("send-channel-message",{
          sender:userInfo?._id,
          content:undefined,
          messageType:"file",
          fileUrl:response.data,
          channelId:selectedChatData._id

        })
          }
          }

        }

        
      }catch(error){
        setIsUploading(false)
        console.log(error)

      }

    }

    const handleAttachmentClick=()=>{
      if(fileInputRef.current){
        fileInputRef.current.click()
      }
    }

    const handleAddEmoji=async(emoji:EmojiClickData)=>{
        setMessage((msg)=>msg+emoji.emoji)
    }
    
    useEffect(()=>{
        function handleClickOutside(event:MouseEvent){
            if(emojiRef.current && !emojiRef.current.contains(event.target as Node)){
                    setEmojiPickerOpen(false);
            }
          
        }
        document.addEventListener("mousedown",handleClickOutside);
        return ()=>{
            document.removeEventListener("mousedown",handleClickOutside)
        }
    },[emojiRef])

    const handleSendMessage=async()=>{
      console.log(selectedChatType + "this is in handle Send message")
      
      if(selectedChatType==="contact"){
                     console.log("this is the chat from contact this shouldnt' be called")
       
           socket.socket?.emit("sendMessage",{
            sender:userInfo?._id,
            content:message,
            recipient:selectedChatData._id,
            messageType:"text",
            fileUrl:undefined

           })
      } else if(selectedChatType=="channel"){

        socket.socket?.emit("send-channel-message",{
          sender:userInfo?._id,
          content:message,
          messageType:"text",
          fileUrl:undefined,
          channelId:selectedChatData._id
        })
      }

    setMessage("")


    }
  return (
    <div className="h-[10vh] bg-[#1c1d25] flex justify-center items-center px-8 mb-6 gap-6">
      <div className='flex-1 flex bg-[#2a2b33] rounded-md items-center gap-5 pr-5'>
        <input type="text" className="flex-1 p-5 bg-transparent rounded-md focus:border-none focus:outline-none"  placeholder='Enter Message' value={message} onChange={(e)=>setMessage(e.target.value)}/> 
        <button onClick={handleAttachmentClick} className='text-neutral-500 focus:border-none focus:outline-none focus:text-white duraion-300 transition-all'>
                            <GrAttachment className="text-2xl"/>
        </button>
        <input type="file" className='hidden' ref={fileInputRef} onChange={handleAttachmentChange} />
        <div className="relative">
                    <button onClick={()=>setEmojiPickerOpen(true)} className='text-neutral-500 focus:border-none focus:outline-none focus:text-white duraion-300 transition-all'>
                            <RiEmojiStickerLine className="text-2xl"/>
        </button>
        <div className='absolute bottom-16 right-0' ref={emojiRef}>
            <EmojiPicker theme={Theme.DARK} open={emojiPickerOpen} onEmojiClick={handleAddEmoji} autoFocusSearch={false}/>
        </div>
        </div>
      </div>
              <button onClick={handleSendMessage} className='bg-[#8417ff] rounded-md flex items-center p-5  justify-center hover:bg-[#741bda] focus:bg-[#741bda] focus:border-none focus:outline-none focus:text-white duraion-300 transition-all'>
                            <IoSend className="text-2xl"/>
        </button>
    
    </div>
  )
}

export default MessageBar
