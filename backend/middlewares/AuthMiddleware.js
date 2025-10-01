import jwt from "jsonwebtoken"

export const verifyToken=(req,res,next)=>{
    try{
        console.log("verify token reached")

    
    const token=req.cookies.token

    if(!token){
        return res.status(401).json({message:"you are not authenticated"})

    }
    const verifyToken=jwt.verify(token,process.env.JWT_KEY)

    if(!verifyToken) {
        return res.status(401).json({message:"token is not valid"})
    }
    
    req.userId=verifyToken.userId;
    
    next()
}catch(error){
console.log("isAuth error")
    return res.status(500).json({message:`isAuth error ${error}`})
    }
}