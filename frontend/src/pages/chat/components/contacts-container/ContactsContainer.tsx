import  { useContext, useEffect } from 'react'
import ProfileInfo from '../chat-container/components/message-bar/ProfileInfo';
import NewDm from './components/NewDm';
import axios from 'axios';
import { authDataContext } from '@/context/AuthContext';
import { useChatStore, useUserStore } from '@/store/slices/auth-slice';
import ContactList from '@/components/ui/ContactList';
import CREATECHANNEL from './components/CreateChannel';

function ContactsContainer() {
  const {serverUrl}=useContext(authDataContext)!
  const {setDirectMessagesContacts,directMessageContacts,channels,setChannels}=useChatStore()
  const {userInfo}=useUserStore()


   
  useEffect(()=>{
    const getContacts=async()=>{
      try{
      const response =await axios.get(`${serverUrl}/api/contacts/get-contacts-for-dm`,{withCredentials:true})
      const newresponse=response.data.contacts.filter((contact:any)=>contact.email!==userInfo?.email)
      if(response.data.contacts){
        setDirectMessagesContacts(newresponse)
      }
    }catch(error:any){
      console.log(error.message)
    }
    }
    const getChannels=async()=>{
      try{
      const response =await axios.get(`${serverUrl}/api/channel/get-user-channels`,{withCredentials:true})

      if(response.data.channels){
        setChannels(response.data.channels)
      }
    }catch(error:any){
      console.log(error.message)
    }
    }
    getContacts()
    getChannels()
  },[setChannels,setDirectMessagesContacts])
  return (
    <div className='relative md:w-[30vw] lg:w-[30vw] lg:w-[30vw] xl:w-[20vw] bg-[#1b1c24] border-r-2 border-[#2f303b] w-full '>
        <div className="pt-3">
            <Logo/>
        </div>
        <div className='my-5'>
            <div className='flex items-center justify-between pr-10'>
                <Title text="Direct Messages"/>
                <NewDm/>
            </div>
            <div className='max-h-[38vh] overflow-y-auto scrollbar-hidden'>
              <ContactList contacts={directMessageContacts} isChannel={false}></ContactList>

            </div>
        </div>
        <div className='my-5'>
            <div className='flex items-center justify-between pr-10'>
                <Title text="Channels"></Title>
                <CREATECHANNEL/>
            </div>
                        <div className='max-h-[38vh] overflow-y-auto scrollbar-hidden'>
              <ContactList contacts={channels} isChannel={true}></ContactList>

            </div>
        </div>
        <ProfileInfo/>

      
    </div>
  )
}

export default ContactsContainer

const Logo = () => {
  return (
    <div className="flex p-5  justify-start items-center gap-2">
      <svg
        id="logo-38"
        width="78"
        height="32"
        viewBox="0 0 78 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {" "}
        <path
          d="M55.5 0H77.5L58.5 32H36.5L55.5 0Z"
          className="ccustom"
          fill="#8338ec"
        ></path>{" "}
        <path
          d="M35.5 0H51.5L32.5 32H16.5L35.5 0Z"
          className="ccompli1"
          fill="#975aed"
        ></path>{" "}
        <path
          d="M19.5 0H31.5L12.5 32H0.5L19.5 0Z"
          className="ccompli2"
          fill="#a16ee8"
        ></path>{" "}
      </svg>
      <span className="text-3xl font-semibold ">Syncronus</span>
    </div>
  );
};

type TitleProps={
    text:string
}


const Title=({text}:TitleProps)=>{
    return  <h6 className="uppercase tracking-widest text-neutral-400 font-light text-opacity-90 text-sm">{text}</h6>
    
}