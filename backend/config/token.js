import jwt from "jsonwebtoken"
const maxAge=3*34*60*60*1000

export const genToken=async(userId,email)=>{
     try{
            const token= jwt.sign({userId,email},process.env.JWT_KEY,{expiresIn:maxAge})
            return token
     }catch(error){
          console.log("token error")
     }
}