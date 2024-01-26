const express=require("express");
const mongoose=require("mongoose");
const bodyParser=require("body-parser");
const jwt=require("jsonwebtoken");
const cookieparser=require("cookie-parser");
const { ObjectId, Decimal128 }=require("mongodb");
const flash=require("connect-flash");
const methodoverride=require("method-override");
const ejs=require("ejs");

const app=express();

app.use(express.static("public"));
app.use(bodyParser.json())
app.set('view engine','ejs');
app.use(methodoverride("_method"));
app.use(cookieparser());
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://localhost:27017/shoes");

const jwtkey = "secret";

const userschema = {
    Firstname:String,
    Lastname:String,
    Phonenumber:Number,
    Gender:String,
    Email:String,
    Address:String,
    Password:String,
    Status:Boolean,
    Favourites:[
        {   
            Productname:String,
            Productid:ObjectId
        }
    ],
    Cart:[
        {
            Subamount:Number,
            Size:Number,
            Quantityid:ObjectId,
            Productid:ObjectId,
            Sellerid:ObjectId
        }
    ],
    Orders:Number
}

const sellerschema = {
    Firstname:String,
    Lastname:String,
    Phonenumber:Number,
    Gender:String,
    Email:String,
    Address:String,
    Password:String,
    Status:Boolean,
    Products:Number
}

const adminschema = {
    Firstname:String,
    Lastname:String,
    Phonenumber:Number,
    Gender:String,
    Email:String,
    Address:String,
    Password:String
}


const prodcutschema = {
    Name:String,
    Brand:String,
    Category: String,
    Type:String,
    Sizes:Number,
    Description:String,
    Image:String,
    Sellerid:ObjectId
}

const sizeschema = {
    Size:Number,
    Mainprice:Number,
    Viewprice:Number,
    Quantity:Number,
    Productid:ObjectId
}

const quantityschema = {
    Size:Number,
    Productid:ObjectId,
    Sellerid:ObjectId
}

const orderschema = {
    Items:Number,
    Amount:Number,
    Date:Date,
    Userid:ObjectId
}

const itemsschema = {
    Subamount:Number,
    Size:Number,
    Quantityid:ObjectId,
    Orderid:ObjectId,
    Userid:ObjectId,
    Productid:ObjectId,
    Sellerid:ObjectId
}

const paymentschema = {
    Amount:Number,
    Date:Date,
    Type:String,
    Orderid:ObjectId,
    Userid:ObjectId
}


const User=mongoose.model("User",userschema);
const Seller=mongoose.model("Seller",sellerschema);
const Admin=mongoose.model("Admin",adminschema);
const Product=mongoose.model("Product",prodcutschema);
const Size=mongoose.model("Size",sizeschema);
const Quantity=mongoose.model("Quantity",quantityschema);
const Order=mongoose.model("Order",orderschema);
const Item=mongoose.model("Item",itemsschema);
const Payment=mongoose.model("Payment",paymentschema);

let tmp=[];
let nice="";
let deftype="Men";

const activesessions = new Map();

    //User InterFace

    function usertoken(req,res,next){

        const token = req.cookies.token;

        if(token===undefined)
        {   
            res.redirect("/login");
        }

        jwt.verify(token,jwtkey,function(err,user){
            if(err){
                console.log(err);
                return res.redirect("/login");
            }
            req.user=user;

            if(req.user.role==="User")
            {
                if(!req.user.status)
                return res.send("ACCOUNT BLOCKED!!!");
                return next();
            }
            res.send("UNAUTHORIZED ACCESS");
        })
    }

    function sellertoken(req,res,next){

        const token = req.cookies.token;

        if(token===undefined)
        res.redirect("/Slogin");

        jwt.verify(token,jwtkey,function(err,user){

            if(err){
                console.log(err);
                return res.redirect("/Slogin");
            }
            req.user=user;

            if(req.user.role==="Seller")
            {
                if(!req.user.status)
                return res.send("ACCOUNT BLOCKED!!!");
                return next();
            }
            res.send("UNAUTHORIZED ACCESS");
        })
    }

    app.get("/home",usertoken,async function(req,res){
        const userid = req.user.userid;
        try{
            const pro = await Product.aggregate([
                {
                    $lookup:{
                        from:"sizes",
                        localField:"_id",
                        foreignField:"Productid",
                        as:"news"
                    }
                }
            ]);
            const found = await User.findOne({_id:userid});
            res.render("home",{user:found,Product:pro});
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/favs",usertoken,async function(req,res){
        const userid =req.user.userid;
        try{
            const Data =[];
            const favs = await User.findOne({_id:userid});
            const vals = favs.Favourites;

            for(const val of vals){
                const info = await Product.aggregate([
                    {
                        $lookup:{
                            from:"sizes",
                            localField:"_id",
                            foreignField:"Productid",
                            as:"news"
                        }
                    },
                    {
                        $match:{_id:val.Productid}
                    }
                ]);
                Data.push(info[0]);
            }
            res.render("favs",{items:Data,user:favs});
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/desc/:id",usertoken,async function(req,res){

        const use = req.user.userid;
        const uni = req.params.id;
        
        try{
            const now = await User.findOne({_id:use});
            const shoe = await Product.aggregate([
                {
                    $lookup:{
                        from:"sizes",
                        localField:"_id",
                        foreignField:"Productid",
                        as:"news"
                    }
                },
                {
                    $match:{_id:new ObjectId(uni)}
                }
            ]);
            const many = await Product.aggregate([
                {
                    $lookup:{
                        from:"sizes",
                        localField:"_id",
                        foreignField:"Productid",
                        as:"news"
                    }
                },
                {
                    $match:{
                        Brand:shoe[0].Brand,
                        Type:shoe[0].Type,
                        _id:{$ne:new ObjectId(uni)}
                    }
                }
            ]);
            res.render("desc",{item:shoe[0],Data:many,user:now});
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/store/:Type",usertoken,async function(req,res){

        const use = req.user.userid;
        const ans = req.params.Type;
        
        try{
            const now = await User.findOne({_id:use});
            const shoes = await Product.aggregate([
                {
                    $lookup:{
                        from:"sizes",
                        localField:"_id",
                        foreignField:"Productid",
                        as:"news"
                    }
                },
                {
                    $match:{Type:ans}
                }
            ]);
            res.render('store',{Data: shoes,states:tmp,city:tmp,streets:nice,hype:ans,user:now});
        }
        catch (err){
            console.log(err);
        }
    })

    app.get("/login",async function(req,res){
        try{
            res.render("login");
        }
        catch (err){
            console.log(err);
        }
    })

    app.get("/register",function (req,res){
        try{
            res.render("register");
        }
        catch (err){
            console.log(err);
        }
    })

    app.post("/register",async function(req,res){
        const newuser = new User({
            Firstname: req.body.Firstname,
            Lastname: req.body.Lastname,
            Phonenumber: req.body.Phonenumber,
            Gender: req.body.Gender,
            Email: req.body.Email,
            Address: req.body.Address,
            Password: req.body.Password,
            Status:true,
            Orders:0,
        });

        try{
            await newuser.save();
            res.status(200).send("User Added Successfully");
        }
        catch (err){
            console.log(err);
        }
    })

    app.post("/login",async function(req,res){
        let useremail = req.body.Email;
        let userpassword = req.body.Password;

        try{
            const found = await User.findOne({Email:useremail})
            if(found && found.Password === userpassword)
            {
                const token = jwt.sign({userid:found._id,username:found.Firstname,role:"User",status:found.Status},jwtkey,{expiresIn:"1h"});
                res.cookie("token",token,{httpOnly:true});
                res.redirect("/home");
            }
            else
            {
                res.status(500).send("Error Finding User");
                console.log(found);
                console.log(found.Password);
                console.log(userpassword);
            }
        }
        catch (err){
            console.log(err);
            res.status(500).send("Error Logging In");
        }
    })

    app.post("/store",usertoken,async function(req,res){
        const use = req.user.userid;
        try{
            const cats = req.body.Category;
            const birds = req.body.Brand;
            const spiders = req.body.Size;
            const mins = req.body.Minprice;
            const maxs = req.body.Maxprice;
            const type = req.body.Type;

            let query={};

            if(cats)
            query.Category = (Array.isArray(cats)? {$in:cats}:cats);
            if(birds)
            query.Brand = (Array.isArray(birds)? {$in:birds}:birds);
            if(spiders)
            query.news = {$elemMatch:{Size:Number(spiders)}};

            if(type)
            {
                query.Type = type;
                deftype = type;
            }
            else
            query.Type = deftype;

            if(mins && maxs)
            query.Price = {$gte:mins,$lte:maxs};
            else if(mins)
            query.Price = {$gte:mins};
            else if(maxs)
            query.Price = {$lte:maxs};
            
            const now = await User.findOne({_id:use});
            const shoes = await Product.aggregate([
                {
                    $lookup:{
                        from:"sizes",
                        localField:"_id",
                        foreignField:"Productid",
                        as:"news"
                    }
                },
                {
                    $match:query
                }
            ]);
            res.render("store",{Data:shoes,states:cats,city:birds,streets:spiders,hype:deftype,user:now});

        }
        catch (err){
            console.log(err);
        }
    })

    app.put("/favs",usertoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        try{
            const shoedets = await Product.findOne({_id:shoe});
            const result = await User.updateOne({_id:userid},{$push:{Favourites:{Productname:shoedets.Name,Productid:shoedets._id}}});
            res.redirect("/desc/"+shoe);
        }
        catch(err){
            console.log(err);
        }
    })

    app.put("/cart",usertoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        const size = req.body.Size;
        const qty = req.body.Quantity;
        try{
            const proprice = await Size.findOne({Productid:shoe,Size:size});

            if(!proprice)
            return console.log("SIZE NOT PRESENT");

            const pros = await Quantity.find({Productid:shoe,Size:size});
            let len = pros.length;

            if(qty>len)
            return console.log("Quantity Not Sufficient");

            for(let i=0;i<qty;i++)
            {
                await User.updateOne({_id:userid},{$push:{Cart:{
                    Subamount:proprice.Viewprice,
                    Size:pros[i].Size,
                    Quantityid:pros[i]._id,
                    Productid:pros[i].Productid,
                    Sellerid:pros[i].Sellerid
                }}});
            }
        }
        catch(err){
            console.log(err);
        }
    })

    app.delete("/favs",usertoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        try{
            const shoedets = await Product.findOne({_id:shoe});
            const result = await User.updateOne({_id:userid},{$pull:{Favourites:{Productname:shoedets.Name,Productid:shoedets._id}}});
            res.redirect("/favs");
        }
        catch(err){
            console.log(err);
        }
    })

    //Seller InterFace

    app.get("/add",sellertoken,async function(req,res){
        const userid = req.user.userid;
        try{
            res.render("addshoe");
        }
        catch (err){
            console.log(err);
        }
    })

    app.get("/Slogin",function(req,res){
        try{
            res.render("Slogin");
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/Sregister",function(req,res){
        try{
            res.render("Sregister");
        }
        catch(err){
            console.log(err);
        }
    })

    app.post("/Slogin",async function(req,res){
        const email = req.body.Email;
        const pass = req.body.Password;

        try{
            const found = await Seller.findOne({Email:email});
            if(found && found.Password===pass)
            {
                const token = jwt.sign({userid:found._id,username:found.Firstname,role:"Seller",status:found.Status},jwtkey,{expiresIn:"1h"});
                res.cookie("token",token,{httpOnly:true});
                res.redirect("/add");  
            }
            else
            {
                console.log("Error Finding User");
                console.log(found);
                console.log(pass);
            }
        }
        catch(err){
            console.log(err);
        }
    })

    app.post("/Sregister",async function(req,res){
        try{
            const newseller = new Seller({
                Firstname:req.body.Firstname,
                Lastname:req.body.Lastname,
                Phonenumber:req.body.Phonenumber,
                Gender:req.body.Gender,
                Email:req.body.Email,
                Address:req.body.Address,
                Password:req.body.Password,
                Status:true,
                Products:0,
            });

            await newseller.save();
            res.status(200).send("Seller Account Created");
        }
        catch(err){
            console.log(err);
        }
    })

    app.post("/add",sellertoken,async function(req,res){

        const sellerid = req.user.userid;
        const found = await Product.findOne({Sellerid:sellerid,Name:req.body.Name});

        if(found)
        return res.send("Product Already Present");
        
        try{

            //PRODUCT INSERT

            const Sellerdata =  await Seller.findOne({_id:sellerid});
            let val = Sellerdata.Products;
            const chk = await Product.find({Sellerid:sellerid}).countDocuments();

            if(chk!=val)
            return console.log("Seller-Product Data Inconsistent");

            const newpro = new Product({
                Name: req.body.Name,
                Brand: req.body.Brand,
                Category: req.body.Category,
                Type: req.body.Type,
                Sizes:0,
                Description: req.body.Description,
                Image: req.body.Image,
                Sellerid:sellerid, 
            });
            const proid = await newpro.save();
            await Seller.updateOne({_id:sellerid},{$set:{Products:val+1}});

            //SIZE INSERT

            const prosize = await Product.findOne({_id:proid._id});
            let newval = prosize.Sizes;
            const sizechk = await Size.find({Productid:proid._id}).countDocuments();

            if(newval!=sizechk)
            return console.log("Product-Size Data Inconsistent");

            let vals = req.body.Price;
            let factor=1.1;
            vals=Math.round(vals*factor);
            const newsize = new Size({
                Size:req.body.Size,
                Mainprice:req.body.Price,
                Viewprice:vals,
                Quantity:0,
                Productid:proid._id,
            });
            const sizeid = await newsize.save();
            await Product.updateOne({_id:proid._id},{$set:{Sizes:newval+1}});

            //QUANTITY INSERT

            for(let i=0;i<req.body.Stock;i++){

                const qty = await Size.findOne({_id:sizeid._id});
                let value = qty.Quantity;
                const qtychk = await Quantity.find({Size:sizeid.Size,Productid:proid._id}).countDocuments();

                if(value!=qtychk)
                return console.log("Size-Quantity Data Inconsistent");

                const newqty = new Quantity({
                    Size:req.body.Size,
                    Productid:proid._id,
                    Sellerid:sellerid,
                });
                await newqty.save();
                await Size.updateOne({_id:sizeid._id},{$set:{Quantity:value+1}});
            }
            res.send("Product Added Successfully");
        }
        catch (err){
            console.log(err);
            res.status(500).send("Error Creating Shoe");
        }
    })

    //Admin InterFace

    app.get("/Alogin",function(req,res){
        try{
            res.render("Alogin");
        }
        catch(err){
            console.log(err);
        }
    })

    app.get("/Aregister",function(req,res){
        try{
            res.render("Aregister");
        }
        catch(err){
            console.log(err);
        }
    })

    app.post("/Aregister",async function(req,res){
        try{
            const newadmin = new Admin({
                Firstname:req.body.Firstname,
                Lastname:req.body.Lastname,
                Phonenumber:req.body.Phonenumber,
                Gender:req.body.Gender,
                Email:req.body.Email,
                Address:req.body.Address,
                Password:req.body.Password,
            });

            await newadmin.save();
            res.status(200).send("Admin Account Created");
        }
        catch(err){
            console.log(err);
        }
    })

app.listen(3000,function(){
    console.log("Server Running at Port 3000");
})

