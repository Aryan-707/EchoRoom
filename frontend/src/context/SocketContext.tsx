import { useChatStore, useUserStore } from "@/store/slices/auth-slice";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

interface SocketProviderProps {
  children: ReactNode;
}



const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { userInfo } = useUserStore();
  const {selectedChatData,selectedChatType,addMessage,addChannelInChannelList,addContactsInDmContacts}=useChatStore()

 

      const handleRecieveChannelMessage=(message:any)=>{
         if(selectedChatType!==undefined && selectedChatData._id===message.channelId){
          addMessage(message)
         }
         addChannelInChannelList(message)

      }
  
    

  useEffect(() => {
    if (userInfo) {
      // Create socket connection
      const socketInstance = io(import.meta.env.VITE_SERVER_URL, {
        withCredentials: true,
        query: { userId: userInfo._id },
      });

      socketInstance.on("connect", () => {
        console.log("Connected to socket server");
        setIsConnected(true);
      });

      socketInstance.on("disconnect", () => {
        console.log("Disconnected from socket server");
        setIsConnected(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      // Update state with socket instance
      setSocket(socketInstance);


      

    

      // Cleanup function
      return () => {
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // If no userInfo, ensure socket is disconnected
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [userInfo]);

  useEffect(() => {
    if (socket) {
      const handleRecieveMessage = (message: any) => {
        console.log("recieved message from handleRecieve Message");
        console.log(selectedChatType); // This will now be the correct value

        if (selectedChatType !== undefined && (selectedChatData?._id === message.sender._id || selectedChatData?._id === message.recipient._id)) {
          console.log("message recieved", message);
          addMessage(message);
        }
         addContactsInDmContacts(message)
        
      };

      // Register the listener
      socket.on("recieveMessage", handleRecieveMessage);
      socket.on("recieve-channel-message",handleRecieveChannelMessage)

      // Cleanup: remove the old listener
      return () => {
        socket.off("recieveMessage", handleRecieveMessage);
      };
    }
  }, [socket, selectedChatType, selectedChatData, addMessage]); 



  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
