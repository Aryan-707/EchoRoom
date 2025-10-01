import { useChatStore } from "@/store/slices/auth-slice"
import { Avatar, AvatarImage } from "./avatar";
import { getColor } from "@/lib/utils";


interface ContactListProps{
    contacts:any[],
    isChannel:boolean
}

const ContactList=({contacts,isChannel=false}:ContactListProps)=>{
    const {
        selectedChatData,
        setSelectedChatData,
        setSelectedChatType,
        setSelectedChatMessages,
       
    }=useChatStore();

    
    const handleClick=(contact:any)=>{
         
         if(isChannel) setSelectedChatType("channel")
            else setSelectedChatType("contact")
        setSelectedChatData(contact)
        if(selectedChatData && selectedChatData._id!==contact._id){
               setSelectedChatMessages([]);
        }

    }
    return <div className="mt-5">
            {contacts.map((contact)=>(
                <div className={`pl-10 py-2 transition-all duration-300 cursor-pointer  ${selectedChatData&& selectedChatData?._id===contact._id?"bg-[#9417ff] hover:bg-[#8417ff]":"hover:bg-[#f1f1f111]"}`} onClick={()=>handleClick(contact)} key={contact._id}>
                    <div className="flex gap-5 items-center justify-start text-neutral-300">
                        {
                            !isChannel&&                      <Avatar className="h-10 w-10  rounded-full overflow-hidden">
                        {contact.image ? (
                          <AvatarImage
                            src={contact.image}
                            alt="profile"
                            className="object-cover w-full h-full bg-black " 
                          />
                        ) : (
                          <div
                            className={` ${selectedChatData && selectedChatData._id===contact._id?"bg-[ffffff22] border-2 border-white/70":getColor(contact.color)}
                                uppercase h-10 w-10 md:w-12 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(
                              contact?.color ? contact.color : 0
                            )}`}
                          >
                            {contact?.firstName
                              ? contact.firstName.split("").shift()
                              : contact?.email.split("").shift()}
                          </div>
                        )}
                      </Avatar>
                        }
                        {isChannel&& <div className="bg-[#ffffff22] h-10 w-10 flex items-center justify-center rounded-full">#</div>}
                        {
                            isChannel?<span>{contact.name}</span>:<span>{contact.firstName?`${contact.firstName} ${contact.lastName}`:contact.email}</span>
                        }
                    </div>
                </div>

            ))}
        </div>
}

export default ContactList
