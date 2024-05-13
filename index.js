const express = require( 'express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware

const corsOptions ={
    origin:["http://localhost:5173", "http://localhost:5174",'https://best-for-you-2df59.web.app','https://best-for-you-2df59.firebaseapp.com'],
    credentials: true,
    optionSuccessStatus: 200

}
  app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())

// verify jwt middleware
const verifyToken=(req,res,next)=>{
  const token =req.cookies?.token
  if (!token) return res.status(401).send({message: 'unauthorized access'})
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
      if(err){
        console.log(err)
        return res.status(401).send({message: 'unauthorized access'})
      }
      console.log(decoded)
      req.user= decoded
      next()
    })
    
  }
  console.log(token)
  
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ycbv1lf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const productsCollection = client.db('alterDB').collection('products')
    const recommendsCollection = client.db('alterDB').collection('recommend')

    // jwt
    app.post('/jwt', async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'365d'})
      res.cookie('token', token,{
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',
        sameSite : process.env.NODE_ENV === 'production'?'none':'strict'
      }).send({success:true})
    })

    // clear a token when logout
    app.get('/logout',(req,res)=>{
      res.clearCookie('token',{
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',
        sameSite : process.env.NODE_ENV === 'production'?'none':'strict',
        maxAge:0,
      }).send({success:true})

    })


    // save a product data in database
   app.post('/products',async(req,res)=>{
    
    const productData = req.body;
    console.log(productData)
    
    const result = await productsCollection.insertOne(productData)
    res.send(result)
 })
 // get all the products
 app.get('/products', async(req,res)=>{
  
  const result =await productsCollection.find().sort({ _id: -1 }).toArray()
  res.send(result)
  
})
 // get all products added by a spacific user
 app.get('/products/:email', verifyToken,async(req,res)=>{
  // const token = req.cookies?.token
  
  // console.log(token)
  const tokenEmail = req.user.email
  console.log(tokenEmail, 'from token')
  const email = req.params.email
  if (tokenEmail !== email) {
    return res.status(403).send({message: 'forbidden access'})
    
  }
  const query = {'queryUser.email':email}

  const result = await productsCollection.find(query).sort({ _id: -1 }).toArray()
  
  res.send(result)
})
// get a single product data from db using id
app.get('/product/:id', verifyToken, async(req,res)=>{
  const tokenData = req.user
  console.log(tokenData, 'from details')
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await productsCollection.findOne(query)
  res.send(result)

})
// delete a single product data from db
app.delete('/product/:id',async(req,res)=>{
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await productsCollection.deleteOne(query)
      res.send(result)
   })
  //  update a product data 
  app.put('/product/:id', verifyToken,  async(req,res)=>{
    const tokenData = req.user
    console.log(tokenData, 'all up')
   
    const id = req.params.id
    const productData = req.body
    const query = {_id: new ObjectId(id)}
    const options ={upsert:true}
    const updateDoc={
      $set:{
        ...productData

      }

    }
    const result = await productsCollection.updateOne(query, updateDoc,options)
    res.send(result)
  })
  // save a recommend data in database
  app.post('/recommend',async(req,res)=>{
    const recommendData = req.body;
    console.log(recommendData)
    const query={
      recommenderEmail: recommendData.recommenderEmail,
      queryId: recommendData.queryId
    }
    const alreadyRecommend= await recommendsCollection.findOne(query)
    if (alreadyRecommend) {
      
      return res.send('Action not permitted')
      
    }

    
    
    
    const result = await recommendsCollection.insertOne(recommendData)
    
    
    const recoQuery = {_id:new ObjectId(recommendData.queryId)}
    const updateRecoCount = await productsCollection.updateOne(recoQuery,{ $inc: { recommendationCount: 1 } })
    console.log(updateRecoCount)
    
    res.send(result)

 })




 // get all recommend for a spacific data
 app.get('/recommend/:id', verifyToken, async(req,res)=>{
  const tokenData = req.user
  console.log(tokenData, 'all recommend')
  const id = req.params.id
  const query = {'queryId':id}
  const result = await recommendsCollection.find(query).toArray()
  res.send(result)

})
// get all recommend of a spacific user
app.get('/my-recommend/:email',verifyToken,async(req,res)=>{
  const tokenEmail = req.user.email
  console.log(tokenEmail, 'from reco')
  const email = req.params.email
  if (tokenEmail !== email) {
    return res.status(403).send({message: 'forbidden access'})
    
  }
  // const email = req.params.email
 
  const query = {'recommenderEmail': email}
 

  const result = await recommendsCollection.find(query).toArray()
 
  
  res.send(result)
})
// delete recommend data from db
app.delete('/recommend/:id',async(req,res)=>{
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await recommendsCollection.deleteOne(query)
  // const recoQuery = {_id:new ObjectId(id)}
    const updateRecoCount = await productsCollection.updateOne(query,{ $inc: { recommendationCount: -1 } })
    console.log(updateRecoCount)
      res.send(result)
   })
   // get all recommends by others for a user
app.get('/all-recommend/:email', verifyToken,async(req,res)=>{
  const tokenEmail = req.user.email
  console.log(tokenEmail, 'from allreco')
  const email = req.params.email
  if (tokenEmail !== email) {
    return res.status(403).send({message: 'forbidden access'})
    
  }
 
  const query = {'userEmail':email}
 

  const result = await recommendsCollection.find(query).toArray()
 
  
  res.send(result)
})
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('server is running best for you')
})

app.listen(port,()=>{
    console.log(`server is running on port:${port}`)
})