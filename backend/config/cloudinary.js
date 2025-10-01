import fs from 'fs'
import {v2 as cloudinary} from "cloudinary"


export const uploadOnCloudinary=async(filePath)=>{
    console.log("uploading on cloudinary")
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    })
    try{
        const uploadResult=await cloudinary.uploader.upload(filePath)
        console.log(uploadResult.secure_url +" this")
        fs.unlinkSync(filePath)
        return uploadResult.secure_url
    }catch(error){
        fs.unlinkSync(filePath)
        return res.status(500).json({message:"cloudinary error"})
    }
}

export const extractPublicId=(publicUrl)=>{
   const parts=publicUrl.split("/")
   const fileName=parts[parts.length-1]
   return fileName.split(".")[0]

}

export const removeFromCloudinary=async (imageUrlId)=>{
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    })
    try{
        const urlId=extractPublicId(imageUrlId)
        const result= await cloudinary.uploader.destroy(urlId)
        console.log(result)
        return result
    }catch(error){
        console.log("cloudinary destroy image" +error)
    }
}
