const express=require("express");
const mongoose=require("mongoose");
const bodyParser=require("body-parser");
const jwt=require("jsonwebtoken");
const cookieparser=require("cookie-parser");
const { ObjectId, Decimal128}=require("mongodb");
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
    Cart:Number,
    Orders:Number,
    Favourites:[
        {   
            Productname:String,
            Productid:ObjectId
        }
    ],
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
    Sizeid:ObjectId,
    Productid:ObjectId,
    Sellerid:ObjectId
}

const cartschema = {
    Subamount:Number,
    Sizeid:ObjectId,
    Quantityid:ObjectId,
    Productid:ObjectId,
    Sellerid:ObjectId,
    Userid:ObjectId
}

const orderschema = {
    Items:Number,
    Amount:Number,
    Date:Date,
    Userid:ObjectId
}

const itemsschema = {
    Subamount:Number,
    Sizeid:ObjectId,
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
const Cart=mongoose.model("Cart",cartschema);
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

    app.get("/cart",usertoken,async function(req,res){
        const userid = req.user.userid;
        try{
            const found = await User.findOne({_id:userid});
            const items = await Cart.aggregate([
                {
                    $lookup:
                    {
                        from:"sizes",
                        foreignField:"_id",
                        localField:"Sizeid",
                        as:"news"
                    }
                },
                {
                    $unwind:"$news"
                },
                {
                    $lookup:{
                        from:"products",
                        foreignField:"_id",
                        localField:"Productid",
                        as:"dets"
                    }
                },
                {
                    $unwind:"$dets"
                },
                {
                    $match:{Userid:new ObjectId(userid)}
                },
                {
                    $group:
                    {
                        _id:
                        {
                            Product:"$dets._id",
                            Size:"$news._id"
                        },
                        count:{$sum:1},
                        Total:{$sum:"$Subamount"},
                        dets:{$first:"$dets"},
                        news:{$first:"$news"}
                    }
                }
            ]);
            res.render("cart",{user:found,cart:items});
        }
        catch(err){
            console.log(err);
        }
    })

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
            Cart:0,
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

    app.post("/cart",usertoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        const size = req.body.Size;
        const qty = req.body.Quantity;
        const ref = req.headers.referer;
        try{
            const proprice = await Size.findOne({Productid:shoe,Size:size});

            if(!proprice)
            return console.log("SIZE NOT PRESENT");

            const pros = await Quantity.find({Sizeid:proprice._id});
            let len = pros.length;
        
            if(!qty)
            return console.log("Quantity Not defined");

            if(qty>len)
            return console.log("Quantity Not Sufficient");
            
            let val = qty;
            for(const pro of pros)
            {
                const chk = await Cart.findOne({Quantityid:pro._id,Userid:userid});

                if(!chk)
                {
                    const userdata = await User.findOne({_id:userid});
                    const cartval = userdata.Cart;
                    const chkval = await Cart.find({Userid:userid}).countDocuments();

                    if(chkval!=cartval)
                    return console.log("User-Cart Data Inconsistent");

                    const cartitem = new Cart({
                        Subamount:proprice.Viewprice,
                        Sizeid:pro.Sizeid,
                        Quantityid:pro._id,
                        Productid:pro.Productid,
                        Sellerid:pro.Sellerid,
                        Userid:userid,
                    });
                    await cartitem.save();
                    await User.updateOne({_id:userid},{$set:{Cart:cartval+1}});

                    val = val - 1;
                    if(val==0)
                    break;
                }
            }
        }
        catch(err){
            console.log(err);
        }
        res.redirect(ref);
    })

    app.put("/cart",usertoken,async function(req,res){
        const userid = req.user.userid;
        const pro = req.body.shoe;
        const size = req.body.Size;
        const qty = req.body.qty;
        try{
            
            const tolcartitems = await Cart.find({Userid:userid,Productid:pro,Sizeid:size}).countDocuments();

            let val = qty-tolcartitems;

            if(val==0)
            return console.log("Error Getting Quantity");

            if(val>0)
            {
                const eles = await Quantity.find({Sizeid:size});

                for(const ele of eles)
                {
                    const pre = await Cart.findOne({Userid:userid,Quantityid:ele._id});

                    if(!pre)
                    {
                        const userdata = await User.findOne({_id:userid});
                        const chk = userdata.Cart;
                        const cartitem = await Cart.find({Userid:userid}).countDocuments();

                        const sizep = await Size.findOne({_id:size});

                        if(chk!=cartitem)
                        return console.log("User-Cart Data Inconsistent");

                        const newcartitem = new Cart({
                            Subamount:sizep.Viewprice,
                            Sizeid:ele.Sizeid,
                            Quantityid:ele._id,
                            Productid:ele.Productid,
                            Sellerid:ele.Sellerid,
                            Userid:userid,
                        });
                        await newcartitem.save();
                        await User.updateOne({_id:userid},{$set:{Cart:chk+1}});

                        val = val -1;
                        if(val==0)
                        break;
                    }
                }
            }
            else
            {
                val = val*-1;
                for(let i=0;i<val;i++)
                {
                    const userdata = await User.findOne({_id:userid});
                    const chk = userdata.Cart;
                    const itms =await Cart.find({Userid:userid}).countDocuments();

                    if(chk!=itms)
                    return console.log("User-Cart Data Inconsistent");

                    const see = await Cart.findOne({Userid:userid,Productid:pro,Sizeid:size});
                    const del = await Cart.deleteOne({_id:see._id});

                    const up = await User.updateOne({_id:userid},{$set:{Cart:chk-1}});
                }
            }
            res.redirect("/cart");
        }
        catch(err){
            console.log(err);
        }
    })

    app.put("/favs",usertoken,async function(req,res){
        const userid = req.user.userid;
        const shoe = req.body.shoe;
        const ref = req.headers.referer;
        try{
            const shoedets = await Product.findOne({_id:shoe});
            const result = await User.updateOne({_id:userid},{$push:{Favourites:{Productname:shoedets.Name,Productid:shoedets._id}}});
            res.redirect(ref);
        }
        catch(err){
            console.log(err);
        }
    })

    app.delete("/cart",usertoken,async function(req,res){
        const userid = req.user.userid;
        const pro = req.body.product;
        const size = req.body.Size;
        try{
            
            const qty = await Cart.find({Userid:userid,Productid:pro,Sizeid:size});
            let sz = qty.length;

            for(let i=0;i<sz;i++)
            {
                const userdata = await User.findOne({_id:userid});
                const chk = userdata.Cart;
                const cartitem = await Cart.find({Userid:userid}).countDocuments();

                if(chk!=cartitem)
                return console.log("Cart-User Data Inconsistent");
                
                const delitem = await Cart.findOne({Userid:userid,Productid:pro,Sizeid:size});
                const del = await Cart.deleteOne({_id:delitem._id});

                const up = await User.updateOne({_id:userid},{$set:{Cart:chk-1}});
            }
            res.redirect("/cart");
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
                const qtychk = await Quantity.find({Sizeid:sizeid._id}).countDocuments();

                if(value!=qtychk)
                return console.log("Size-Quantity Data Inconsistent");

                const newqty = new Quantity({
                    Sizeid:sizeid._id,
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

