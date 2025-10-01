// import { disconnect } from "mongoose"
// import {Server as SocketIoServer} from "socket.io"
// import Message from "./models/MessageModel.js"
// import Channel from "./models/ChannelModel.js"


// const setupSocket=(server)=>{
//      const io=new SocketIoServer(server,{
//         cors:{
//             origin:"https://echo-room-frontend1.onrender.com",
//             methods:["GET","POST"],
//             credentials:true
//         }

//      })

//      const userSocketMap=new Map()

//      const disconnect=(socket)=>{
//         console.log("client disconnnected ${socket.id}")
//         for(const [userId,socketId] of userSocketMap.entries()){
//             if(socketId===socket.id){
//                 userSocketMap.delete(userId)
//                 break;
//             }
//         }
//      }

//      const sendMessage=async(message)=>{
        
//             const senderSocketId=userSocketMap.get(message.sender)
//             const recipientSocketId=userSocketMap.get(message.recipient)


//             const createdMessage=await Message.create(message)

//             const messageData=await Message.findById(createdMessage._id).populate("sender","id email firstName lastName image color ").populate("recipient","id email firstName lastName image color ")


//             if(recipientSocketId){
//                 console.log("reci")

//                 io.to(recipientSocketId).emit("recieveMessage",messageData) 
//             }
//             if(senderSocketId){
//                 console.log("send")
//                 io.to(senderSocketId).emit("recieveMessage",messageData)

//             }   

//      }

//      const sendChannelMessage=async(message)=>{
//         console.log("this is called send Channel message")
//          const {channelId,sender,content,messageType,fileUrl}=message
   
//          const createdMessage=await Message.create({
//             sender,
//             recipient:null,
//             content,
//             messageType,
//             timestamp:new Date(),
//             fileUrl
//          })
//          console.log(createdMessage)
//          const messageData=await Message.findById(createdMessage._id).populate("sender","id email firstName lastName image color").exec()
//         console.log(messageData)
//          await Channel.findByIdAndUpdate(channelId,{
//             $push:{messages:createdMessage._id},
//          })

//          const channel=await Channel.findById(channelId).populate("members")

//          const finalData={...messageData._doc,channelId:channel._id}
//          console.log("final data")
//          console.log(finalData)


         

//          if(channel && channel.members){
//                 channel.members.forEach((member)=>{
//                            const memberSocketId=userSocketMap.get(member._id.toString())

//                            if(memberSocketId){
//                             io.to(memberSocketId).emit("recieve-channel-message",finalData)
//                            }
                     
                           
//                 })
//                       const adminSocketId=userSocketMap.get(channel.admin._id.toString())
//                 if(adminSocketId){
//                             io.to(adminSocketId).emit("recieve-channel-message",finalData)
//                            }
//          }


//      }

//      io.on("connection",(socket)=>{
//         const userId=socket.handshake.query.userId

//         if(userId){
//             userSocketMap.set(userId,socket.id)
//              console.log(`user connected ${userId} with socketId ${socket.id}`)
//         }else{
//             console.log("user id not provided during connection")
//         }
            
//         socket.on("sendMessage",sendMessage)
//         socket.on("send-channel-message",sendChannelMessage)

//         socket.on("disconnect",()=>disconnect(socket))
//      })


// }

// export default setupSocket


import { disconnect } from "mongoose"
import {Server as SocketIoServer} from "socket.io"
import Message from "./models/MessageModel.js"
import Channel from "./models/ChannelModel.js"
import Redis from "ioredis"


const setupSocket=(server)=>{
     const io=new SocketIoServer(server,{
        cors:{
            origin:["https://echo-room-frontend1.onrender.com","http://localhost:5173", "http://localhost:5174"],
            methods:["GET","POST"],
            credentials:true
        }

     })

     const userSocketMap=new Map()

     const redisConfig = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    tls: {
        rejectUnauthorized: false
    },
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
    },
    maxRetriesPerRequest: 3
}


    const pub = new Redis(redisConfig)
    const sub = new Redis(redisConfig)

// Add connection event handlers
pub.on('connect', () => {
    console.log(' Redis PUB connected successfully!')
})

pub.on('error', (err) => {

    console.error(' Redis PUB error:', err.message)
})

sub.on('connect', () => {
    console.log(' Redis SUB connected successfully!')
})

sub.on('error', (err) => {
    console.error(' Redis SUB error:', err.message)
})


   sub.subscribe("direct-message", "channel-message", (err) => {
        if (err) {
            console.error("Failed to subscribe to Redis channels:", err)
        } else {
            console.log("Successfully subscribed to Redis channels")
        }
    })


    
sub.on("message",async(channel,message)=>{
      const data=JSON.parse(message)

    if(channel=="direct-message"){
           const {messageId,senderId,recipientId}=data
           const recipientSocketId=userSocketMap.get(recipientId)
           const senderSocketId=userSocketMap.get(senderId)

           if(recipientSocketId|| senderSocketId){
                      
             const messageData = await Message.findById(messageId)
                        .populate("sender", "id email firstName lastName image color")
                        .populate("recipient", "id email firstName lastName image color")

             if (recipientSocketId) {
                        console.log(`Delivering to recipient on this server: ${recipientId}`)
                        io.to(recipientSocketId).emit("recieveMessage", messageData)
                    }
                    if (senderSocketId) {
                        console.log(`Delivering to sender on this server: ${senderId}`)
                        io.to(senderSocketId).emit("recieveMessage", messageData)
                    }

           }

    }else if(channel==="channel-message"){
           const {messageId,channelId}=data
           
           const messageData = await Message.findById(messageId)
                        .populate("sender", "id email firstName lastName image color")
           
           const channel = await Channel.findById(channelId).populate("members")
           
           if(channel){
                const finalData={...messageData._doc,channelId:channel._id}
                
                // Send to all members on this server
                if(channel.members){
                    channel.members.forEach((member)=>{
                        const memberSocketId=userSocketMap.get(member._id.toString())
                        if(memberSocketId){
                            console.log(`Delivering channel message to member on this server: ${member._id}`)
                            io.to(memberSocketId).emit("recieve-channel-message",finalData)
                        }
                    })
                }
                
                // Send to admin on this server
                const adminSocketId=userSocketMap.get(channel.admin._id.toString())
                if(adminSocketId){
                    console.log(`Delivering channel message to admin on this server: ${channel.admin._id}`)
                    io.to(adminSocketId).emit("recieve-channel-message",finalData)
                }
           }
    }
})



     const disconnect=(socket)=>{
        console.log("client disconnnected ${socket.id}")
        for(const [userId,socketId] of userSocketMap.entries()){
            if(socketId===socket.id){
                userSocketMap.delete(userId)
                break;
            }
        }
     }

     const sendMessage=async(message)=>{
        
            const createdMessage=await Message.create(message)

            // Publish to Redis - all servers (including this one) will receive via subscriber
            await pub.publish("direct-message",JSON.stringify({
                messageId:createdMessage._id.toString(),
                senderId:message.sender,
                recipientId:message.recipient
            }))
            
            console.log(`Published direct message to Redis: ${createdMessage._id}`)

     }

     const sendChannelMessage=async(message)=>{
         console.log("this is called send Channel message")
         const {channelId,sender,content,messageType,fileUrl}=message
   
         const createdMessage=await Message.create({
            sender,
            recipient:null,
            content,
            messageType,
            timestamp:new Date(),
            fileUrl
         })
         
         await Channel.findByIdAndUpdate(channelId,{
            $push:{messages:createdMessage._id},
         })

         // Publish to Redis - all servers will receive via subscriber
         await pub.publish("channel-message",JSON.stringify({
            messageId:createdMessage._id.toString(),
            channelId:channelId
         }))
         
         console.log(`Published channel message to Redis: ${createdMessage._id}`)
     }

     io.on("connection",(socket)=>{
        const userId=socket.handshake.query.userId

        if(userId){
            userSocketMap.set(userId,socket.id)
             console.log(`user connected ${userId} with socketId ${socket.id}`)
        }else{
            console.log("user id not provided during connection")
        }
            
        socket.on("sendMessage",sendMessage)
        socket.on("send-channel-message",sendChannelMessage)

        socket.on("disconnect",()=>disconnect(socket))
     })


}

export default setupSocket

