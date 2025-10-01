
import {create} from "zustand"









export interface userType{
    _id:string,
    email:string,
    password:string,
    firstName?:string,
    lastName?:string,
    image?:string,
    color?:number,
    profileSetup:Boolean,
    createdAt?:Date,
    updatedAt?:Date
}

export interface chatSlice{
    selectedChatType:undefined |string
    selectedChatData:any
    selectedChatMessage:any[],
    directMessageContacts:any[],
    isUploading:boolean,
    isDownloading:boolean,
    fileUploadProgress:number
    fileDownloadProgress:number
    channels:any[],
    setChannels:(channels:any[])=>void
    setIsUploading:(isUploading:boolean)=>void,
    setIsDownloading:(isDownloading:boolean)=>void,
    setFileUploadProgress:(fileUploadProgress:number)=>void
    setFileDownloadProgress:(fileDownloadProgress:number)=>void,
    addChannel:(channel:any)=>void,
    setSelectedChatType:(selectedChatType:string|undefined)=>void
    setSelectedChatData:(selectedChatData:any)=>void
    setSelectedChatMessages:(selectedChatMessage:any[])=>void
    setDirectMessagesContacts:(directMessageContact:any[])=>void
    addChannelInChannelList:(message:any)=>void
    addContactsInDmContacts:(message:any)=>void
    closeChat:()=>void
     addMessage:(message:any)=>void
   
}


export const useChatStore=create<chatSlice>((set,get)=>({
   selectedChatType:undefined,
   selectedChatData:undefined,
   directMessageContacts:[],
   selectedChatMessage:[],
   isUploading:false,
   isDownloading:false,
   fileDownloadProgress:0,
   fileUploadProgress:0,
   channels:[],
   addChannelInChannelList:(message)=>{
       const channels=get().channels;
       const data=channels.find((channel)=>channel._id===message.channelId)
       const index=channels.findIndex((channel)=>channel._id===message.channelId)
       if(index!=-1 && index!=undefined){
        channels.splice(index,1)
        channels.unshift(data)
       }
   },
    addContactsInDmContacts:(message)=>{
      console.log("add store called")
      const userId= useUserStore.getState().userInfo?._id;
      const formId=message.sender._id===userId?message.recipient._id:message.sender._id
      const formData=message.sender._id===userId?message.recipient:message.sender
      const dmContacts=get().directMessageContacts;
      const data=dmContacts.find((contact)=>contact._id===formId)
      const index=dmContacts.findIndex((contact)=>contact._id===formId)
      if(index!==-1 && index!==undefined){
        dmContacts.splice(index,1)
        dmContacts.unshift(data)
      }else{
        console.log("in else condition")
        dmContacts.unshift(formData)
      }


    },
   setChannels:(channels)=>set({channels}),
   addChannel:(channel)=>{
         const channels=get().channels
         set({channels:[channel,...channels]})
   },

   setIsUploading:(isUploading)=>set({isUploading}),
   setIsDownloading:(isDownloading:boolean)=>set({isDownloading}),
    setFileUploadProgress:(fileUploadProgress:number)=>set({fileUploadProgress}),
    setFileDownloadProgress:(fileDownloadProgress:number)=>set({fileDownloadProgress}),
   setSelectedChatType:(selectedChatType)=>set({selectedChatType}),
   setSelectedChatData: (selectedChatData) => set({ selectedChatData }),

     setSelectedChatMessages: (selectedChatMessages) =>
    set({ selectedChatMessage: selectedChatMessages }),
         setDirectMessagesContacts:(directMessageContact)=>set({directMessageContacts:directMessageContact}),
    addMessage: (message) => {
    const selectedChatMessages = get().selectedChatMessage;
    const selectedChatType = get().selectedChatType;
    
    
    set({
      selectedChatMessage: [
        ...selectedChatMessages,
        {
          ...message,
          recipient:
            selectedChatType === "channel"
              ? message.recipient
              : message.recipient._id,
          sender:
            selectedChatType === "channel"
              ? message.sender
              : message.sender._id,
        }
      ],
    });
   },

     closeChat: () =>
    set({
      selectedChatType: undefined,
      selectedChatData: undefined,
      selectedChatMessage: [],
    }),
    

}))


export interface AuthSlice{
    userInfo:userType|undefined
    setUserInfo:(userInfo:userType|undefined)=>void
}

export const useUserStore=create<AuthSlice>((set)=>({
    userInfo: undefined,
    setUserInfo:(userInfo:userType|undefined)=>set(()=>({userInfo}))
   
}))

  





