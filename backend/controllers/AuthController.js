import User from "../models/UserModel.js";
import validator from "validator"
import { genToken } from "../config/token.js";
import bcrypt from "bcrypt"
import { removeFromCloudinary, uploadOnCloudinary } from "../config/cloudinary.js";


export const signUp = async (req,res)=>{
    try{
    const {email,password}=req.body;
     console.log()
    if(!email || !password){
        return res.status(400).json({message:"Email and Password is required"})
    }
    const existUser=await User.findOne({email})
    
    if(existUser){
        return res.status(400).json({message:"user already exists"})
    }
   
    if(!validator.isEmail(email)){
          return res.status(400).json({message:"Enter valid Email"})
    }
 
    if(password.length < 8){
        return res.status(400).json({message:"Enter Strong Password"})
    }

    let hashpassword=await bcrypt.hash(password,10)
   
     
    const user=await User.create({email,password:hashpassword})
  

    let token=await genToken(user._id,email)
    

    res.cookie("token",token,{
        httpOnly:true,
        secure:true,
        sameSite:"None",
        maxAge:3*34*60*60*1000

    })
 
    return res.status(200).json(user)


    }catch(error){
        return res.status(500).json({message:"Internal server error signup failed"})
    }
}

export const login= async (req,res)=>{
    try{
    const {email,password}=req.body;
    
    if(!email || !password){
        return res.status(400).json({message:"Email and Password is required"})
    }
    const user=await User.findOne({email})
    
    if(!user){
        return res.status(400).json({message:"user with the given email doesn't exist"})
    }
   
    if(!validator.isEmail(email)){
          return res.status(400).json({message:"Enter valid Email"})
    }
 
    if(password.length < 8){
        return res.status(400).json({message:"Enter Strong Password"})
    }

    const auth=await bcrypt.compare(password,user.password)
    if(!auth){
        return res.status(400).send("password is incorrect")
    }

  

    let token=await genToken(user._id,email)
    

    res.cookie("token",token,{
        httpOnly:true,
        secure:true,
        sameSite:"None",
        maxAge:3*34*60*60*1000

    })
 
    return res.status(200).json(user)


    }catch(error){
        return res.status(500).json({message:"Internal server error signup failed"})
    }
}


export const getUserInfo=async(req,res,next)=>{
    try{
        
        const userData=await User.findById(req.userId)
        
        if(!userData){
            return res.status(400).json({message:"user with the given data not found"})
        }
        return res.status(200).json(userData)
    }catch(error){
        return res.status(500).json({message:"Internal server error"})
    }
}

export const updateProfile=async(req,res)=>{
    try{
        const userId=req.userId
        const {firstName,lastName,color}=req.body
        
        console.log(lastName)
        if(!firstName || !lastName ){
            return res.status(400).json({message:"firstname,lastname and color are required"})
        }
        console.log(userId)
        console.log(firstName)
        console.log(lastName)
        console.log(color)
        const userData=await User.findByIdAndUpdate(userId,{firstName,lastName,color,profileSetup:true},{new:true,runValidators:true})
        console.log(userData)
            return res.status(200).json(userData)
    }catch(error){
          console.log(error)
          return res.status(500).json({message:"internal server error"})
    }
}


export const addProfileImage=async (req,res,next)=>{
    console.log("add profile reached")
    let image1;
    console.log(req.file)
    try{
    if(req.file){
        image1=await uploadOnCloudinary(req.file.path)    

        const user= await User.findByIdAndUpdate(req.userId,{image:image1},{new:true}).select("-password")
        console.log(user)
        return res.status(200).json(user)     
    }else{
        res.status(400).send("file is required")
    }
}catch(error){
     console.log("add-profile error"+error.message)
     return res.status(500).json("internal server error")
}
}

export const removeProfileImage=async(req,res,next)=>{
    try{
   const {userId}=req
   const user=await User.findById(userId)

   if(!user){
    return res.status(404).json({message:"user not found"});
   }
   if(user.image){
     const result=removeFromCloudinary(user.image)
     console.log("cloudinary delete complete")
   }
   user.image=null
   await user.save()
   const updatedUser = await User.findById(userId).select("-password");
   return res.status(200).json(updatedUser)
}catch(error){
       console.log({error})
       return res.status(500).json({message:"internal server error"})
   }
}

export const logout=async(req,res,next)=>{
    try{
        res.clearCookie("token")
        console.log("cleared cookie")
        return res.status(200).json({message:"logout successfull"})
        
    }catch(error){
        return res.status(500).json({message:"clear cookie"})
    }
}