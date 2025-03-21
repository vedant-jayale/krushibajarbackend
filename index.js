

const port = 3000 ;
const express=require("express");
const app=express();

const mongoose=require("mongoose");
const jwt= require("jsonwebtoken");
const cors= require("cors");
const multer= require("multer");
const path = require("path");   // using this path we can get access to directories in backend development 
const Razorpay = require("razorpay");
const crypto = require("crypto");

const { v4: uuidv4 } = require('uuid');

const { error, log } = require("console");
const { type } = require("os");


app.use(express.json());  // with the help of this whatever request that we get from response it get automaticaly parse through json

app.use(cors()); // using this our react js project connect to exprees app on 4000 port 

// Allow requests from Netlify domain
const allowedOrigins = [
    'https://krushibajar.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    // Add other Netlify domains if necessary
  ];
  
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));

// database connection with mongodb :
// connection string for database connection with mongodb: mongodb+srv://vedantjayle2003:<password>@ecommercecluster.iblb4f6.mongodb.net/
mongoose.connect("mongodb+srv://vedantjayle2003:ecommerce@cluster0.p6m6ytc.mongodb.net/e-commerce");
console.log("connected he") 


const razorpay = new Razorpay({
    key_id:"rzp_live_zKyksfIZKRMWoL",
    key_secret:"GFyG7DG81mab1DoIEjZCCqWJ",
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
app.post("/addtocart", fetchUser, async (req, res) => {
    try {
        console.log("added ", req.body.itemId);
        let userData = await Users.findOne({ _id: req.user.id });

        if (!userData.cartData[req.body.itemId]) {
            userData.cartData[req.body.itemId] = 0;
        }

        userData.cartData[req.body.itemId] += 1;
        await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

        res.json({ success: true, message: "Added to cart", cartData: userData.cartData });
        console.log(req.body, req.user);
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ success: false, message: "Failed to add to cart" });
    }
});


  // creating endpoint for removefromcart :
app.post("/removefromcart", fetchUser, async (req, res) => {
  try {
    console.log("Removing item with ID:", req.body.itemId);
    
    let userData = await Users.findOne({ _id: req.user.id });

    // Check if the item exists in the cart and decrement quantity
    if (userData.cartData[req.body.itemId] > 0) {
      userData.cartData[req.body.itemId] -= 1;
      
      // Update the cart data in the database
      await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

      // Send a JSON response
      return res.json({ success: true, message: "Item removed from cart" });
    } else {
      // Send a response indicating the item was not found or already removed
      return res.json({ success: false, message: "Item not found in cart or already at zero" });
    }

    console.log(req.body, req.user);
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


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
        image_url:`https://krushibajarbackend.onrender.com/images/${req.file.filename}` // usiing image url we can accces to thr image 

    })
})


// Example verification endpoint
app.get('/verifyimages', async (req, res) => {
    try {
        const products = await Product.find({});
        console.log(products);
        res.json(products);
    } catch (error) {
        res.status(500).send('Error fetching products');
    }
});
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

// Remove product route
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


const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  customer_name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false, // optional
  },
  shipping_address: {
    type: String,
    required: true,
  },
  products: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      total: { type: Number, required: true }, // Ensure this field is included
      image: { type: String },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Delivered', 'In Track or Route'],
    default: 'Pending',
    required: true,
  },
  deliveryManName: {
    type: String,
  },
  deliveryManMobile: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});



// COD or Online Checkout
app.post('/checkout', fetchUser, async (req, res) => {
  try {
    console.log('Request Body:', req.body); // Log the request body
    const {
      customer_name,
      mobile,
      email,
      shipping_address,
      products,
      totalAmount,
      paymentMethod,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    const user_id = req.user.id;
    const order_id = uuidv4();

    if (paymentMethod === 'Online') {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", razorpay.key_secret)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }
    }

    const newOrder = new Order({
      user_id,
      order_id,
      customer_name,
      mobile,
      email,
      shipping_address,
      products,
      totalAmount,
      paymentMethod,
      orderStatus: 'Pending',
      deliveryManName: '',
      deliveryManMobile: ''
    });

    await newOrder.save();
    console.log('✅ Order saved successfully');
    res.status(200).json({ message: 'Order placed successfully!', order_id });
  } catch (error) {
    console.error('❌ Error placing order:', error.message);
    res.status(500).json({ message: 'Error placing order', error: error.message });
  }
});

// 🟢 Route: Get logged-in user's orders
app.get('/myorders', fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id });
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 🟢 Route: Get all orders (admin)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

// 🟢 Route: Create Razorpay order
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const options = {
      amount,
      currency,
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error Creating Razorpay Order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🟢 Route: Verify Razorpay payment
app.post('/verify-payment', async (req, res) => {
  try {
    const { order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = `${order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', razorpay.key_secret).update(body).digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// 🟢 Route: Update order status (admin)
app.post('/update-order-status', async (req, res) => {
  try {
    const { order_id, orderStatus, deliveryManName, deliveryManMobile } = req.body;

    if (!order_id || !orderStatus) {
      return res.status(400).json({ message: 'Order ID and status are required' });
    }

    const order = await Order.findByIdAndUpdate(
      order_id,
      { orderStatus, deliveryManName, deliveryManMobile },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

// 🟢 Route: Get single order by ID (for status tracking)
app.get('/order-status/:order_id', fetchUser, async (req, res) => {
  try {
    const { order_id } = req.params;
    const order = await Order.findOne({ _id: order_id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order status', error: error.message });
  }
});

// 🟢 Route: Update order manually (duplicate but included for flexibility)
app.post('/updateorder', async (req, res) => {
  try {
    const { orderId, status, delivery_man_name, delivery_man_contact } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    order.delivery_man_name = delivery_man_name;
    order.delivery_man_contact = delivery_man_contact;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🟢 Route: Delete order by admin
app.delete('/admin/delete-order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminKey = req.query.adminKey;

    if (adminKey !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Invalid admin key' });
    }

    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order deleted successfully by admin' });
  } catch (error) {
    console.error('Error deleting order by admin:', error);
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

// 🟢 Route: Delete order by user
app.delete('/delete-order/:id', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOneAndDelete({ _id: id, user_id: req.user.id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found or does not belong to user' });
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting user order:', error);
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});


const screenshotStorage = multer.diskStorage({
    destination: './upload/screenshots',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
  });
  
  const uploadScreenshot = multer({ storage: screenshotStorage });
  
  app.use('/screenshots', express.static(path.join(__dirname, 'upload/screenshots')));
  
  app.post('/upload-screenshot', uploadScreenshot.single('screenshot'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: 0, message: 'No file uploaded' });
    }
  
    res.json({
        success: 1,
        screenshot_url: `https://krushibajarbackend.onrender.com/screenshots/${req.file.filename}` // URL to access the screenshot
    });
  });
  

