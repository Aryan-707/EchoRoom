import multer from 'multer'

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
      cb(null,"./public")
    },
    filename:(req,file,cb)=>{
        cb(null,file.originalname)
    }
})

const upload=multer({storage})
export default upload



const storage1 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public")
    },
    filename: (req, file, cb) => {
        // Create a unique filename by prepending a timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
})

export const upload1 = multer({ storage:storage1 })
