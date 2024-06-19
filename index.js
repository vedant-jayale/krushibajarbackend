

const port = 3000 ;
const express=require("express");
const app=express();

const mongoose=require("mongoose");
const jwt= require("jsonwebtoken");
const cors= require("cors");
const multer= require("multer");
const path = require("path");   // using this path we can get access to directories in backend development 


const { error, log } = require("console");
const { type } = require("os");


app.use(express.json());  // with the help of this whatever request that we get from response it get automaticaly parse through json

app.use(cors()); // using this our react js project connect to exprees app on 4000 port 

// database connection with mongodb :
// connection string for database connection with mongodb: mongodb+srv://vedantjayle2003:<password>@ecommercecluster.iblb4f6.mongodb.net/
mongoose.connect("mongodb+srv://vedantjayle2003:ecommerce@cluster0.p6m6ytc.mongodb.net/e-commerce");
console.log("connected he") 

//old:


//for deployment : to connect frontend with backend :
app.get("/",(req,res)=>{
   app.use(express.static(path.resolve(__dirname,"frontend","build")));
   res.sendFile(path.resolve(__dirname,"frontend","build","index.html")) ;
});


//API creations:

app.get("/",(req,res)=>{

    res.send("Express app is running");

})

// creating api for deleting products :

// Remove Product endpoint
app.post("/removeproduct", async (req, res) => {
    const productId = req.body.id;
    console.log("Removing product with ID:", productId);
    try {
        const deletedProduct = await Product.findOneAndDelete({ id: productId });
        if (deletedProduct) {
            console.log("Item removed successfully");
            res.json({
                success: true,
                name: deletedProduct.name
            });
        } else {
            console.log("Product not found");
            res.status(404).json({ success: false, error: "Product not found" });
        }
    } catch (error) {
        console.error("Error removing product:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// creating API for getting all product :

app.get("/allproducts", async (req, res) => {
    try {
        let products = await Product.find({});
        console.log("All products fetched:", products);
        res.json({ success: true, products: products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

//Schema creating for user model 
const Users=mongoose.model('Users',{
    name:{
        type:String,
       
    }, 
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,

    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }

})

//creating endpoint for regestering users :

 app.post('/signup',async (req,res)=>{ 
      let check=await Users.findOne({email:req.body.email});
      if(check)
      {
        return res.status(400).json({success:false,error:"existing user found with same email id"})
      }
      let cart = {}
      for(let i=0;i<300;i++)
      {
        cart[i]=0;
      }

      const user =new Users({
      
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
      
 })

   await user.save();

   //jwt authentication:

   const data = {
    user:{
        id:user.id
    }
   }

   const token =jwt.sign(data,"secret_ecom");
   res.json({success:true,token})

})
  // cretaing end point for user login:

  app.post("/login",async(req,res)=> {
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password ===user.password;
        if(passCompare)
        {
            const data ={
                user:{
                    id:user.id
                }
            }
            const token =jwt.sign(data,"secret_ecom")
            res.json({success:true,token});
        
        }
        else{
            res.json({success:false,error:"wrong password "})
        }

    }
    else{
        res.json({success:false,error:"wrong email id "});
    }
  })



  // creating endpoint for newcollection data :
  app.get("/newcollection",async(req,res)=>{
    let products=await Product.find({category:"new collections"});
    let newcollection =products.slice(1).slice(-8);  //we get recently added 8 product
    console.log("newcollection feched");
    res.send(newcollection)
  })

 // creating endpoint for popular in fertilizers :
 app.get("/popularinfertilizers",async(req,res)=>{
    let products= await Product.find({category:"fertilizers"});
    let popular_in_fertilizers =products.slice(1).slice(-8);  //we get recently added 8 product
    console.log("popular in fertilizers feched");
    res.send(popular_in_fertilizers)
  })

   // creating endpoint for other products :
 app.get("/otherProducts",async(req,res)=>{
    let products= await Product.find({category:"others"});
    let others_product =products.slice(1).slice(-8);  //we get recently added 8 product
    console.log("other products  feched");
    res.send(others_product)
  })
 

  // creating middleware to fetch user :

  const fetchUser =async (req,res,next) =>{
    const token = req.header("auth-token");
    if(!token){
        res.status(401).send({error:"Please authenticate using valid token "})
    }
    else{
        try{
            const data =jwt.verify(token,"secret_ecom");
            req.user=data.user;
            next();

        }
        catch(error)
        {
            res.status(401).send({error:"Please authenticate using valid token"})
        }
    }

  }

  // creating endpoint for addtocart :
 app.post("/addtocart",fetchUser,async(req,res)=>{
    console.log("added ",req.body.itemId);
    let userData= await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findByIdAndUpdate({_id:req.user.id}, {cartData:userData.cartData})

    res.send("Added")

  
    console.log(req.body,req.user);
    
  })

  // creating endpoint for removefromcart :
 app.post("/removefromcart",fetchUser,async(req,res)=>{
    console.log("removed ",req.body.itemId);
    let userData= await Users.findOne({_id:req.user.id});

    if (userData.cartData[req.body.itemId]>0)

    userData.cartData[req.body.itemId]-=1;
    await Users.findByIdAndUpdate({_id:req.user.id}, {cartData:userData.cartData})

    res.send("Removed")

  
    console.log(req.body,req.user);
    
  })

   // creating endpoint to get cartdata :

 app.post("/getcart",fetchUser,async(req,res)=>{
    console.log("GetCart ",req.body.itemId);
    let userData= await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);

    
    
  })


app.listen(port, (error) => {
    if (!error) {
        console.log("Server running on port: " + port);
    } else {
        console.log("Error: " + error);
    }
})

//Image storage engine:


const storage =multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return  cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)

    }
})


const upload=multer({storage:storage})

// creating upload endpooints for images:
app.use('/images', express.static(path.join(__dirname, 'upload/images'))); // whatever images store in upload/images we get it into /images 

app.post("/upload",upload.single('product'),(req,res)=>{    //we creted "/upload to upload any images to the end point "
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}` // usiing image url we can accces to thr image 

    })
})


//schema for creating productss:

const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,

    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,

    },
    category:{
        type:String,
        required:true,
    },
    new_price: {
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    quantity:{
        type:String,
        required:true,
    },
    use:{
        type:String,
        required:true,
    },
    plants:{
        type:String,
        required:true,
    },
    ingredients:{
        type:String,
        required:true,
    },

    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },

})

console.log("model tyar ho ra")

app.post('/addproduct',async(req,res)=> {
    let products =await Product.find({});
    let id ;
    if(products.length>0)
    {
      let last_product_array = products.slice(-1);
      let last_product= last_product_array[0];
      id=last_product.id+1;

    }
    else{
        //if database hass no product
        id=1;
    }


    const product =new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        quantity:req.body.quantity,
        use:req.body.use,
        plants:req.body.plants,
        ingredients:req.body.ingredients,

    });

    console.log(product);

    // saving data into database hence used await :
    await product.save();
    console.log("data saved succesfully");

    res.json({
        success:true,
        name:req.body.name,
    })
})


