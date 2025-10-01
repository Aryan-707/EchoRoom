import { useContext, useState } from "react";
import { useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FaPlus } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";
import { authDataContext } from "@/context/AuthContext";
import { useChatStore} from "@/store/slices/auth-slice";
import { Button } from "@/components/ui/button";
import MultipleSelector,{type Option} from "@/components/ui/MultipleSelector";

function CREATECHANNEL() { 

  const { serverUrl } = useContext(authDataContext)!;
  const [channelName,setChannelName]=useState("")  
  const[newChannelModal,setNewChannelModal]=useState(false)
  const [allContacts, setAllContacts] = useState<Option[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Option[]>([]);
  const {addChannel}=useChatStore()


  useEffect(()=>{
    // console.log("use effect of create channel called")
   

        const getData=async()=>{
               const response=await axios.get(`${serverUrl}/api/contacts/get-all-contacts`,{withCredentials:true})
            //    console.log(response.data)
               setAllContacts(response.data.contacts)
        }
        getData()
  },[])
  


 const createChannel=async()=>{
         try{
           
            if(channelName.length>0 && selectedContacts.length>0){
                
            const response=await axios.post(`${serverUrl}/api/channel/create-channel`,{
        name:channelName,
        members:selectedContacts.map((contact)=>contact.value)
         },{withCredentials:true})
         if(response.status===201){
            setChannelName("")
            setSelectedContacts([])
            setNewChannelModal(false)
            addChannel(response.data.channel)
         }
        }
         }catch(error){
            console.log(error)
         }
 }

 




  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              onClick={() => setNewChannelModal(true)}
              className="text-neutral-400 font-light text-opacity-90 text-start hover:text-neutral-100 cursor-pointer transition-all duration-300 "
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3 text-white">
            {" "}
            Create New Channel
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={newChannelModal} onOpenChange={setNewChannelModal}>
        <DialogContent className="bg-[#181920] border-none text-white w-[400px] h-[400px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Please fill up the details for new channel</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div>
            <input
              type="text"
              placeholder="Channel Name"
              className="rounded-lg p-6 bg-[#2c2e3b]  w-full border-black"
              onChange={(e) => setChannelName(e.target.value)}
              value={channelName}
            />
          </div>
          <div>
            <MultipleSelector className="rounded-lg bg-[#2c2e3b] border-none py-2 text-white" 
            options={allContacts}
            placeholder="Search Contacts"
            value={selectedContacts}
            onChange={setSelectedContacts}
            emptyIndicator={
                <p className="text-center text-lg leading-10 text-gray-600">
                                    No Results found
                    </p>

            }

            
            />
          </div>

          <div>

            <Button onClick={createChannel} className="w-full bg-purple-700 hover:bg-purple-900 transition-all duration-300">Create Channel</Button>
          </div>
    
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CREATECHANNEL

